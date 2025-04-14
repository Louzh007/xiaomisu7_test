import './style.css'

//导入 three
import * as THREE from 'three'
//导入 gasp
// import gasp from 'gasp';

//导入lil-gui
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
//创建一个GUI对象
const gui = new GUI();   

//导入 hdr 加载器
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

//导入 tween 动画库
import * as TWEEN  from 'three/examples/jsm/libs/tween.module.js';

// 引入 ref,响应式切换
import {ref} from 'vue';    

//导入 gsap动画库
import { gsap } from 'gsap';

// 打开辉光效果，要先在文件顶部添加以下导入
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';       
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';



//创建一个场景
const scene = new THREE.Scene();
//创建相机
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
//设置相机位置,具体位置在 animate 中的最下面设置，为了能跟车移动保持相同偏移
const cameraOffset = new THREE.Vector3(0, 3.5, -5);        //定义相机初始位置
camera.position.copy(cameraOffset);
// camera.lookAt(0, 0, 0);    //设置相机观察点,默认原点,下面启用了轨道控制器，这个就不生效了，默认目标点是 controls.target
//将相机添加到场景中
scene.add(camera);
//创建渲染器
const renderer = new THREE.WebGLRenderer(
    {
        antialias: true,  //抗锯齿
        alpha: true       //不设置背景颜色，默认为false
    }
);
//创建一个画布并绘制渐变
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// 设置画布大小
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 创建渐变背景
const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
gradient.addColorStop(0, '#435362');  // 渐变开始颜色
gradient.addColorStop(1, '#000000');  // 渐变结束颜色

// 填充背景色
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 创建纹理
const gradientTexture = new THREE.CanvasTexture(canvas);

// 设置纹理重复模式
gradientTexture.wrapS = THREE.RepeatWrapping;
gradientTexture.wrapT = THREE.RepeatWrapping;
// 将渐变纹理设置为场景的背景
scene.background = gradientTexture;


//设置渲染器的大小
renderer.setSize(window.innerWidth, window.innerHeight);     
//将渲染器添加到body中
document.body.appendChild(renderer.domElement);      

//创建世界坐标系
const axesHelper = new THREE.AxesHelper(2);
//将世界坐标系添加到场景中
// scene.add(axesHelper);


// 导入轨道控制器
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls' 
//将轨道控制器添加到场景中
const controls = new OrbitControls(camera, renderer.domElement);

//添加阻尼，让物体移动时，有阻尼效果
controls.enableDamping = true;
//设置阻尼值，值越小，停下来越慢，不设置时默认值为 0.05
controls.dampingFactor = 0.05;

controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,  // 左键旋转
  MIDDLE: THREE.MOUSE.DOLLY, // 中键缩放
  RIGHT: THREE.MOUSE.PAN     // 右键平移
};

//先在全局定义 mixer和 clock,播放 glb 自带的动画用
let mixer;
const clock = new THREE.Clock();


// 设置辉光效果，在渲染器初始化后添加
let composer;
let bloomPass; 
function initPostProcessing() {
    composer = new EffectComposer(renderer);        
    
    // 先添加背景渲染通道
    const bgPass = new RenderPass(scene, camera);
    composer.addPass(bgPass);      // 添加基础渲染场景
    
    //添加辉光通道
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,   // strength (辉光强度)
        1,   // radius (辉光半径)
        2  // threshold (亮度阈值)
    );
    bloomPass.selectedObjects = [carlight]; // 指定模型给辉光

    composer.addPass(bloomPass);      

}



// 监听窗口大小变化，当窗口大小变化时，调用onWindowResize函数
window.addEventListener('resize', function () {
  //重置渲染器输出画布canvas尺寸
  renderer.setSize(window.innerWidth, window.innerHeight);
  //重新获取窗口大小
  camera.aspect = window.innerWidth / window.innerHeight;
  //重新计算相机的投影矩阵
  camera.updateProjectionMatrix();
});  



//导入 glb 加载器
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// 导入 glb 加载器,命名为 xiaomisu7
const xiaomusu7 = new GLTFLoader();    

// 创建一个对象来存储模型参数,在下面用来控制整体场景 gltf.scene 的缩放位移
const modelControls = {
    scale: 1,
    rotationY: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0
};


//车轮键盘控制开始1   ***************************
//获取wasd四个按钮
const keycontrol = {
    w: document.getElementById('W_Control'),
    a: document.getElementById('A_Control'),
    s: document.getElementById('S_Control'),
    d: document.getElementById('D_Control')
  };
//定义wasd键盘初始状态
const keyPressed = { w: false, a: false, s: false, d: false };
// //键盘触发逻辑函数
function updatakeycontrol(key,result) {
    keyPressed[key] = result;        // 设置键值
    keycontrol[key].classList.toggle('button-active', result);     // 设置按钮的样式
}
//按下去为 true，松手为 false,并兼容大小写
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key in keyPressed) updatakeycontrol(key, true);
  });
  
  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key in keyPressed) updatakeycontrol(key, false);
  });
// document.addEventListener('keydown', function (event) {
//     if (event.key.toLowerCase()  === 'w') keyPressed.w = true;    // 按下 W 键
//     if (event.key.toLowerCase()  === 'a') keyPressed.a = true;    // 按下 A 键
//     if (event.key.toLowerCase()  === 's') keyPressed.s = true;    // 按下 S 键
//     if (event.key.toLowerCase()  === 'd') keyPressed.d = true;    // 按下 D 键
// });
// document.addEventListener('keyup', function (event) {
//     if (event.key.toLowerCase()  === 'w') keyPressed.w = false;    // 按下 W 键
//     if (event.key.toLowerCase()  === 'a') keyPressed.a = false;    // 按下 A 键
//     if (event.key.toLowerCase()  === 's') keyPressed.s = false;    // 按下 S 键
//     if (event.key.toLowerCase()  === 'd') keyPressed.d = false;    // 按下 D 键
// });

//监听鼠标长按 wasd 四个按钮事件
// 绑定所有控制事件
Object.entries(keycontrol).forEach(([key, btn]) => {
    // 鼠标事件
    btn.addEventListener('mousedown', () => updatakeycontrol(key, true));
    btn.addEventListener('mouseup', () => updatakeycontrol(key, false));
    btn.addEventListener('mouseleave', () => updatakeycontrol(key, false));
  
    // 触摸事件
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      updatakeycontrol(key, true);
    });
    btn.addEventListener('touchend', () => updatakeycontrol(key, false));
  });
// document.addEventListener('mousedown', function (event) {
//     // //如果点击的是w按钮
//     if (event.target === controls[key]) {
//         keycontrol(key,true);
//     }
    // if (event.target === Abtn) {
    //     keyPressed.a = true;
    // }
    // if (event.target === Sbtn) {
    //     keyPressed.s = true;
    // }
    // if (event.target === Dbtn) {
    //     keyPressed.d = true;
    // }
// });
//鼠标抬起事件
// document.addEventListener('mouseup', function (event) {
//     //如果点击的是w按钮
//     if (event.target === Wbtn) {
//         keyPressed.w = false;
//     }
//     if (event.target === Abtn) {
//         keyPressed.a = false;
//     }
//     if (event.target === Sbtn) {
//         keyPressed.s = false;
//     }
//     if (event.target === Dbtn) {
//         keyPressed.d = false;
//     }
// });
// //鼠标离开按钮也停止
// document.addEventListener('mouseleave', function (event) {
//     //如果点击的是w按钮
//     if (event.target === Wbtn) {
//         keyPressed.w = false;
//     }
//     if (event.target === Abtn) {
//         keyPressed.a = false;
//     }
//     if (event.target === Sbtn) {
//         keyPressed.s = false;
//     }
//     if (event.target=== Dbtn) {
//         keyPressed.d = false;
//     }
// })

//设置轮胎旋转速度,const 定义的变量不可变，所以得用 let
let WHEEL_SPEED = 0;
//设置轮胎加速度
const jiasudu = 0.002;
//设置轮胎最大速度
const MAX_WHEEL_SPEED = 0.5;
//设置轮胎旋转角度
const TURN_ANGLE = 0.02;
//设置轮胎半径
const WHEEL_RADIUS = 0.35;
//全局定义轮胎名字
let zuoqianlun, youqianlun, zuohoulun, youhoulun; 
// （添加加载完成标记）
let isModelLoaded = false;  // 模型是否加载，先为 false
//给两个前轮绑定一个父级，来控制左右转向，定义这两个父级的名字
let zuoqianlunParent, youqianlunParent;
//一个车身父级，控制启动的悬挂;一个整车父级，控制车身的旋转;还有一个车中心点，用于绑定摄像机目标点
let carbodyParent, carParent, car_center_point;
//定义车身材质、玻璃材质、车尾灯材质、车尾灯模型
let carbodyMaterial, glassMaterial, backlightMaterial, carlight;
//定义车尾灯初始亮度
let backlightIntensity = 0;
//定义车身悬挂初始角度,悬架两个轴旋转，一个绕z轴也就是前后，一个是绕x轴也就是左右
let carbodyRotationz = 0;
let carbodyRotationx = 0;
//定义车悬挂左转右转的加速度，这里用在左右转弯的时候
const xuanguajiao = 0.003;
//定义车悬挂启动后加速度，这里用在起步和刹车的压头和抬头时候
const xuanguajiasu = 0.0045;
//定义 加速时车身悬挂最大翘起角度
const MAX_xuanguajiao = 0.039;
//定义刹车时车身悬挂最大压下角度
const MIN_xuanguajiao = -0.03;
//是否处于加速状态
let isAccelerating = false;
//是否处于减速状态
let isBraking = false;
//定义车的转弯半径和转弯系数
const carRadius = 3;
const carTurnFactor = 0.05;
//定义车的初始朝向
let forwardDirection = new THREE.Vector3(1, 0, 0);
//保存 carParent 的初始位置,和四元数方向
let firstposition = new THREE.Vector3(0, 0, 0);
let firstquaternion = new THREE.Quaternion();
// 在全局定义车门动画实例
let action0, action1; 

//车轮键盘控制结束1   ***************************


xiaomusu7.load(
    './models/xiaomi su7-action3.glb',          
    function (gltf) {               // 模型加载成功时执行
        
        // 初始设置,这个 modelControls 的缩放、位移值，会导致后续想要跟踪 xiaomusu7 模型的位置不准，相对位置和绝对位置的原因
        gltf.scene.scale.set(modelControls.scale, modelControls.scale, modelControls.scale);
        gltf.scene.rotation.y = modelControls.rotationY;
        gltf.scene.position.set(
            modelControls.positionX,
            modelControls.positionY,
            modelControls.positionZ
        );
        
        // 初始化车辆位置
        // carParent.position.set(0, 0, 0); 

        // 遍历模型所有网格并设置阴影,并找到四个轮子
        gltf.scene.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;    // 投射阴影

                // console.log('节点名称:', node.name); // ✅ 打印所有名称
                
                //车轮键盘控制开始2   ***************************
                //历遍模型，找到四个轮胎并赋予定义
                switch (node.name) {
                    case 'zuoqianlun': zuoqianlun = node;                
                    break;
                    case 'youqianlun': youqianlun = node;               
                    break;
                    case 'zuohoulun': zuohoulun = node;
                    break;
                    case 'youhoulun': youhoulun = node;
                    break;
                }
                // 捕获 左前轮和右前轮的父级
                if (node.name === 'zuoqianlunParent') {
                        zuoqianlunParent = node; // 直接使用导出的父级
                }
                if (node.name === 'youqianlunParent') {
                        youqianlunParent = node;
                }
                //捕获 车身父级 和车父级,还有车中心点
                if (node.name === 'carbodyParent') {
                    carbodyParent = node;
                }
                if (node.name === 'carParent') {
                    carParent = node;
                }
                if (node.name === 'car_center_point') {
                    car_center_point = node;
                }
                //捕获车尾灯的网格
                if (node.name === 'Object_22') {
                    carlight = node;
                }

                // // 检查所有轮胎是否已绑定
                // if (zuoqianlun && youqianlun && zuohoulun && youhoulun) {
                //        isModelLoaded = true;
                //     } else {
                //          console.error("轮胎加载失败，请检查模型节点名称！");
                //         }

                //打印glb 的材质名称
                console.log('材质名称:', node.material.name);
                // 处理glb中是单个或多个材质的情况，统一转换成数组
                let materials;
                if (Array.isArray(node.material)) { // 判断材质是否是数组
                  materials = node.material;        // 是数组：直接使用
                } else {
                  materials = [node.material];      // 是单个材质：包装成数组
                }
                
                //捕获Car_body 材质
                materials.forEach((material) => {
                    // 通过材质名称匹配目标材质，找到车身材质
                    if (material.name === 'Car_body') {
                        carbodyMaterial = material;
                    }
                    //找到玻璃材质
                    if (material.name === 'Car_window') {
                        glassMaterial = material;
                    }
                    //找到车尾灯材质
                    if (material.name === 'Car_backlight') {
                        backlightMaterial = material;
                    }
                });
                 
                //车轮键盘控制结束2   ***************************
            }
        });

        // 修改车身颜色为三个车漆按钮的第一个按钮的date自定义属性的颜色
        // 获取第一个颜色按钮的 data-color 值
        const firstColorBtn = document.querySelector('.colorselect_s');
        const defaultColor = firstColorBtn.dataset.color;

        // 设置默认颜色（确保材质已加载）
        if (carbodyMaterial) {
            carbodyMaterial.color.set(defaultColor);
            carbodyMaterial.metalness = 0.3;  // 高金属度表现车漆质感
            carbodyMaterial.roughness = 0.3;   // 中等粗糙度
            console.log('材质类型:', carbodyMaterial.type);
            // 物理材质的额外设置
            if (carbodyMaterial.isMeshPhysicalMaterial) {
                carbodyMaterial.clearcoat = 1.0;
                carbodyMaterial.clearcoatRoughness = 0.1;
            }
            carbodyMaterial.needsUpdate = true; // 确保材质更新
            carbodyMaterial.needsUpdate = true; // 重要！强制材质更新
        }

        // 激活第一个按钮的样式
        firstColorBtn.classList.add('active');

        //重新设置一下玻璃材质
        if (glassMaterial) {
            glassMaterial.color.set(new THREE.Color('rgb(34, 34, 34)'));    //车窗颜色
            glassMaterial.metalness = 0.01;  // 一点金属度
            glassMaterial.roughness = 0.01;   // 低粗糙度
            glassMaterial.transparent = true;  // 必须启用透明度
            glassMaterial.opacity = 0.85;
            glassMaterial.needsUpdate = true; // 重要！强制材质更新
        }

        //设置车尾灯自发光和自发光强度
        if (backlightMaterial) {
            backlightMaterial.emissive.set(new THREE.Color(0xff0000));    //自发光颜色
            backlightMaterial.emissiveIntensity = backlightIntensity;  // 发光强度等于初始设置的亮度
            backlightMaterial.toneMapped = false;     // 禁用色调映射
            backlightMaterial.needsUpdate = true; // 重要！强制材质更新
        }


        //复制初始的车辆位置和车辆四元数方向，为了下面按下 1,2,3,4 时，车回到原处
        firstposition = carParent.position.clone();
        firstquaternion = carParent.quaternion.clone();


        // 添加到场景
        scene.add(gltf.scene);
        
        
        // // 添加旋转控制d
        // gui.add(modelControls, 'rotationY', 0, Math.PI * 2)
        // .onChange((value) => {
        //     gltf.scene.rotation.y = value;
        // });
        
        // // 添加位置控制
        // gui.add(modelControls, 'positionX', -10, 10)
        // .onChange((value) => {
        //     gltf.scene.position.x = value;
        // });
        
        // gui.add(modelControls, 'positionY', -10, 10)
        // .onChange((value) => {
        //     gltf.scene.position.y = value;
        // });
        
        // gui.add(modelControls, 'positionZ', -10, 10)
        // .onChange((value) => {
        //     gltf.scene.position.z = value;
        // });
        

        //车门开关动画开始   ***************************
        //添加动画混合器
        mixer = new THREE.AnimationMixer(gltf.scene);
        // 获取动画clips（所有动画）
        const animations = gltf.animations;
        console.log('动画列表：', animations); // 可以看到所有可用的动画

        // 播放指定动画
        action0 = mixer.clipAction(animations[1]);  // 获取第一个动画
        action0.setLoop(THREE.LoopOnce);   // 设置循环模式为仅播放一次
        action0.clampWhenFinished = true;   //停留在最后一帧

        action1 = mixer.clipAction(animations[2]); // 获取第二个动画
        action1.setLoop(THREE.LoopOnce);   // 设置循环模式为仅播放一次
        action1.clampWhenFinished = true;  // 停留在最后一帧,不然会回到初始状态

        //action0 和 action1 是在 xiaomusu7.load 的回调函数内部定义的局部变量，无法在外部的事件监听器中访问，所以在这里要提升动画
        window.action0 = action0;
        window.action1 = action1;

        //可以添加动画控制（可选）
        // const animationControls = {
        //     play: false,    //初始未勾选
        // };
        // gui.add(animationControls, 'play').name('打开副驾驶车门')
        //     .onChange(value => {
        //         if (value) {
        //             //重新开始播放一次
        //             action0.timeScale = 1;   //正向播放动画，速度为1
        //             action0.reset();
        //             action0.play();  // 必须手动启动
        //         } else {
        //             action0.timeScale = -2;   //反向播放动画,来关闭车门，速度为-2  
        //             action0.paused = false;  // 确保动画没暂停;
        //             //如果动画已经结束，重置后，从头开始倒放,getClip().duration动画的总时长（单位：秒）
        //             if (action0.time === action0.getClip().duration) {
        //                 action0.time = action0.getClip().duration; // 关键：设置起点
        //                 action0.play();
        //             } else {
        //                 //如果动画未结束，从当前时间倒放
        //                 action0.play();
        //             }
        //         }
        //     });
        // gui.add(animationControls, 'play').name('打开驾驶室车门')
        //     .onChange(value => {
        //         if (value) {
        //             //重新开始播放一次
        //             action1.timeScale = 1;   //正向播放动画，速度为1
        //             action1.reset();
        //             action1.play();  // 必须手动启动
        //         } else {
        //             action1.timeScale = -2;   //反向播放动画,来关闭车门，速度为-2  
        //             action1.paused = false;  // 确保动画没暂停;
        //             //如果动画已经结束，重置后，从头开始倒放,getClip().duration动画的总时长（单位：秒）
        //             if (action1.time === action1.getClip().duration) {
        //                 action1.time = action1.getClip().duration; // 关键：设置起点
        //                 action1.play();
        //             } else {
        //                 //如果动画未结束，从当前时间倒放
        //                 action1.play();
        //             }
        //         }
        //     });

        //车门开关动画结束   ***************************

        isModelLoaded = true;  //表示模型已加载

        

        //这个是上面设置好的辉光效果，给模型添加
        initPostProcessing(); // 添加这行

        // 🔥 添加辉光对象选择（必须在此处，确保carParent已加载）
        // bloomPass.selectedObjects = [carlight]; // 仅车辆模型产生辉光



    },
    undefined,
    function (error) {
        console.error(error);
    }
);

//添加鼠标点击车门开门的交互
//监听鼠标点击事件
const raycaster = new THREE.Raycaster();  // 用来发射射线，检测是否与物体相交
const mouse = new THREE.Vector2();        // 用来存储鼠标在屏幕上的位置，范围是 [-1, 1]

window.addEventListener('click', function (event) {
    
    //把鼠标点击的屏幕位置转换为标准化坐标（-1 到 1 的坐标）
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -((event.clientY + 0) / window.innerHeight) * 2 + 1;     // 这里的+100是因为我在style中给画布canvas做了向上偏移100px的偏移
  
    //设置射线的起点和方向
    raycaster.setFromCamera(mouse, camera);
  
    //获取所有相交对象
    // const intersects = raycaster.intersectObjects(scene.children);
    const intersects = raycaster.intersectObjects(scene.children, true); 
    if (intersects.length === 0) return;     // 如果没有相交对象，直接返回

    // 定义射线和鼠标第一个接触的物体
    const firstmesh = intersects[0].object;
    const meshName = firstmesh.name;
    
    //如果第一个点击对象左前门，执行开门函数
    // 匹配左前门所有部件
    if (meshName.startsWith('zuoqianmen')) { 
       console.log('左前门部件被点击:', meshName);
       openDoor(action1, 'left');
       console.log('左前门状态:', isLeftDoorOpen);
       return; // 处理第一个匹配项后退出
    }
    
    // 匹配右前门所有部件
    if (meshName.startsWith('youqianmen')) {
        console.log('右前门部件被点击:', meshName);
        openDoor(action0, 'right');
        console.log('右前门状态:', isRightDoorOpen);
        return;
    }
}
)
//开门函数
let isLeftDoorOpen = false; // Track the left door state
let isRightDoorOpen = false; // Track the right door state

function openDoor(action, doorType) {

        // 根据 doorType 判断是左门还是右门
        const isLeftDoor = doorType === 'left';
        const isRightDoor = doorType === 'right';
    
        if (isLeftDoor) {
            // 处理左前门动画
            if (action.time === 0) {
                action.timeScale = 1;     //正向播放动画，速度为1
                action.reset();        // 重置动画
                action.play();     //手动播放动画
                isLeftDoorOpen = true;
                
            } else {
                action.timeScale = -2;
                action.paused = false;
                isLeftDoorOpen = false;
                //如果动画已经结束，重置后，从头开始倒放,getClip().duration动画的总时长（单位：秒）
                if (action.time === action.getClip().duration) {
                    action.time = action.getClip().duration;     // 关键：设置起点
                    action.play();
                } else {
                    //如果动画未结束，从当前时间倒放
                    action.play();
                }
            }
        }
    
        if (isRightDoor) {
            // 处理右前门动画
            if (action.time === 0) {
                action.timeScale = 1;
                action.reset();
                action.play();
            isRightDoorOpen = true;

            } else {
                action.timeScale = -2;
                action.paused = false;
                isRightDoorOpen = false;
                if (action.time === action.getClip().duration) {
                    action.time = action.getClip().duration;
                    action.play();
                } else {
                    action.play();
                }
            }
        }
    
}
// 安全检测函数，如果车速不等于 0，并且门是开着的，执行关门函数
function checkDoorSafety() {
        // 当车速大于某个阈值并且门是开着的时，执行关门
        if (Math.abs(WHEEL_SPEED) > 0.01) {
            if (isLeftDoorOpen) {
                closeDoor(action1, 'left');
            }
            if (isRightDoorOpen) {
                closeDoor(action0, 'right');
            }
        }
}

// 关门函数
function closeDoor(action, doorType) {

        // 和 openDoor 类似，设置 action 播放反向动画以关闭门
        if (doorType === 'left') {
            action.timeScale = -2;
            action.paused = false;
            action.play();
            isLeftDoorOpen = false; // 标记左门已关闭
        }
    
        if (doorType === 'right') {
            action.timeScale = -2;
            action.paused = false;
            action.play();
            isRightDoorOpen = false; // 标记右门已关闭
        }
}

//鼠标移动到车门，显示文字

let isHoveringDoor = false;
// 找到id 是开门或关门文字的 div
const tipOpen = document.getElementById('doorTipOpen');
const tipClose = document.getElementById('doorTipClose');

// 创建射线检测和鼠标跟踪函数
function updateDoorHover(event) {
    // 更新鼠标位置，这里 Y+100是因为在 css 中整个场景向上偏移了 100px
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -((event.clientY + 0) / window.innerHeight) * 2 + 1;
    
    // 执行射线检测
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length === 0) return;     // 如果没有相交对象，直接返回

    // 判断是否悬停在车门上,也只监视鼠标接触的第一个物体
    const hitDoor = intersects.length > 0 && (
        intersects[0].object.name.startsWith('zuoqianmen') || 
        intersects[0].object.name.startsWith('youqianmen')
    );
    
    // 更新鼠标状态
    if(hitDoor !== isHoveringDoor) {
        isHoveringDoor = hitDoor;
        document.body.style.cursor = hitDoor ? 'pointer' : 'default';
        tipOpen.style.display = hitDoor ? 'block' : 'none';
        tipClose.style.display = hitDoor ? 'block' : 'none';
    }
    
    // 如果鼠标在 zuoqianmen上面
    if (intersects[0].object.name.startsWith('zuoqianmen') ) {
        tipOpen.style.display = isLeftDoorOpen ? 'none' : 'block';
        tipClose.style.display = isLeftDoorOpen ? 'block' : 'none';

        // 统一更新位置（避免重复计算）
        const targetTip = isLeftDoorOpen ? tipClose : tipOpen;
        targetTip.style.left = `${event.clientX + 15}px`;
        targetTip.style.top = `${event.clientY + 15}px`;
    }
    // 如果鼠标在 youqianmen 上面
    if (intersects[0].object.name.startsWith('youqianmen') ) {
        tipOpen.style.display = isRightDoorOpen ? 'none' : 'block';
        tipClose.style.display = isRightDoorOpen ? 'block' : 'none';

        // 统一更新位置（避免重复计算）
        const targetTip = isRightDoorOpen ? tipClose : tipOpen;
        targetTip.style.left = `${event.clientX + 15}px`;
        targetTip.style.top = `${event.clientY + 15}px`;
    }
}

// 优化性能：使用requestAnimationFrame节流
let raf;
window.addEventListener('mousemove', (event) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
        updateDoorHover(event);   //调用鼠标移动到门的函数
    });
});

// 处理窗口变化时重新定位
window.addEventListener('resize', () => {
    tipOpen.style.display = 'none';
    tipClose.style.display = 'none';

    isHoveringDoor = false;
    document.body.style.cursor = 'default';
});


//创建水面
import { Water } from 'three/examples/jsm/objects/Water2.js';
import { max, time } from 'three/src/nodes/TSL.js';
//创建一个圆形平面
const waterGeometry = new THREE.CircleGeometry(100, 100, 32, 32);
//创建一个水
const water = new Water(waterGeometry, {
  color: 0xffffff,
  scale: 15,
  flowDirection: new THREE.Vector2(1, 1),     // 流方向
  textureWidth: 2048,
  textureHeight: 2048,
  flowSpeed: 0.05,         // 流动速度
  reflectivity: 0.5,       // 反射光
  alpha: 1,                // 透明度
//   sunDirection: new THREE.Vector3(0, 1, 0),         // 太阳方向
})
//两面显示
water.material.side = THREE.DoubleSide;
water.position.set(0, -0.05, 0);     // 设置水位置
water.rotation.x = -Math.PI / 2;     // 水面旋转
water.receiveShadow = true;          // 接收阴影
//把水添加到场景中
scene.add(water);



//创建 1234 四个按键，切换相机视角,同时车回到初始位置

//使用gsap 补间动画移动相机位置和朝向
let cameratimeline = gsap.timeline();
let carpositontimeline = gsap.timeline();
//定义一个相机视角移动函数
function translationcamera(cameraPosition,time) {

    // 清除旧动画，防止连按的时候旧动画继续执行
    cameratimeline.clear();
    
    // carParent.position.copy(firstposition);
    // carParent.quaternion.copy(firstquaternion);
    carpositontimeline.to(carParent.position, {
        x: firstposition.x,
        y: firstposition.y,
        z: firstposition.z,
        duration: time,     // 设置补间动画时长
        ease: 'power1.inOut',     // 设置补间动画类型
    })

    carpositontimeline.to(carParent.quaternion, {
        x: firstquaternion.x,
        y: firstquaternion.y,
        z: firstquaternion.z,
        w: firstquaternion.w,
        duration: time,     // 设置补间动画时长
        ease: 'power1.inOut',     // 设置补间动画类型
    },0)         //加 0 是为了同时执行两个动画

    cameratimeline.to(camera.position, {
        x: cameraPosition.x,
        y: cameraPosition.y,
        z: cameraPosition.z,
        duration: time,     // 设置补间动画时长
        ease: 'power1.inOut',     // 设置补间动画类型
    })
    // cameratimeline.to(controls.target, {
    //     x: cameraTarget.x,
    //     y: cameraTarget.y,
    //     z: cameraTarget.z,
    //     duration: time,          // 设置补间动画时长
    //     ease: 'power1.inOut',       // 设置补间动画类型
    // },0)           

    cameratimeline.restart();         // 重新开始动画
}
let sences = [
    {
        text: '场景1',
        callback: function () {
            translationcamera(
                { x: 5.8, y: 1.2, z: 0 },
                1
            )
        }
    },
    {
        text: '场景2',
        callback: function () {
            translationcamera(
                // { x: -5, y: 1.2, z: -1.2 },
                { x: 0, y: 1.4, z: -5.5 },
                1
            )
        }
    },
    {
        text: '场景3',
        callback: function () {
            translationcamera(
                // { x: 0, y: 1.4, z: -5.5 },
                { x: -5, y: 1.2, z: -1.2 },
                1
            )
        }
    },
    {
        text: '场景4',
        callback: function () {
            translationcamera(
                { x: -3, y: 3, z: -3 },
                1
            )
        }
    }
]
let index = ref(0);
//监听键盘输入事件
window.addEventListener('keydown', function (event) {
    switch (event.key) {
        case '1':
            index.value = 0;
            sences[0].callback();        //这个对象中的 callback 属性来调用函数
            break;
        case '2':
            index.value = 1;
            sences[1].callback();
            break;
        case '3':
            index.value = 2;
            sences[2].callback();
            break;
        case '4':
            index.value = 3;
            sences[3].callback();
            break;
    }
});



//创建 hdr 加载器
const hdrLoader = new RGBELoader();
// 创建控制参数对象（必须用对象才能被GUI修改）
// 创建控制hdr贴图强度的初始强度
const hdrcontrols = {
    environmentIntensity: 1.2  // 初始强度值
};
//加载hdr贴图
hdrLoader.load('./Zbyg-Studio_0022_4k.hdr', function (envmap) {
  //设置贴图映射类型,球形贴图
  envmap.mapping = THREE.EquirectangularReflectionMapping;   

  //将贴图添加到场景中，为了场景中能看到 hdr 贴图
    // scene.background = envmap;   
  //设置环境贴图，给材质打环境光
  scene.environment = envmap;   
  
  // 设置初始强度
  scene.environmentIntensity = hdrcontrols.environmentIntensity;
  // 在 HDR 加载完成后添加 GUI 控制
  gui.add(hdrcontrols, 'environmentIntensity', 0, 5, 0.1)
    .name('HDR Intensity')
    .onChange((value) => {
    scene.environmentIntensity = value;
    });
});


//开启场景中阴影贴图
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 可选：柔和阴影
//添加环境光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);   
//添加平行光
// const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
// directionalLight.position.set(10, 10, 10);
//设置平行光显示阴影
// directionalLight.castShadow = true;
// scene.add(directionalLight);


// gui.add(directionalLight, 'intensity', 0, 10);


 /**
 * 绕指定点旋转对象,下面是对三个参数的注释
 * @param {THREE.Object3D} object     要旋转的对象（如 carParent）
 * @param {THREE.Vector3}  centerPoint 旋转中心的世界坐标
 * @param {number}         angle      旋转角度（弧度）
 */
//这是车绕着指定点旋转的函数
function rotateAroundPoint(object, centerPoint, angle) {
         // 1. 计算对象相对于旋转中心的偏移量
        const offset = new THREE.Vector3()
        .subVectors(object.position, centerPoint);

         // 2. x.applyAxisAngle(n,m)将当前向量x绕一个 ​自定义轴n,旋转指定的 ​弧度角度m，将得到的向量offset绕y轴旋转指定角度
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        // 3. 旋转角度后的offset+centerPoint，就是绕中心点旋转后的对象位置
        object.position.addVectors(centerPoint, offset);
        
        // 4. 车子本身也跟着旋转
        object.rotation.y += angle;
}

//这是车前后移动的函数
function moveCar(object, direction, speed) {
    //如果按了w，车子的前进后退距离是轮胎转速*轮胎半径，计算位移
    const moveDistance = -speed * WHEEL_RADIUS;
    
    // 将位移应用到 carParent 上
    object.position.add(direction.multiplyScalar(moveDistance));   

}


// 添加帧率控制变量
// let lastFrameTime = 0;
// const FRAME_INTERVAL = 16; // ~60fps

//这是车悬挂加速减速抬头压头的函数
function update_xuangua() {
    //按下 w ，并且车没有处于加速状态时
    if (keyPressed.w && !isAccelerating) {
        //如果按下了 w键前进，车头抬头到指定位置，在下面会加一个过渡帧动画
        // carbodyRotationz = MAX_xuanguajiao;
        carbodyRotationz = Math.min(carbodyRotationz + xuanguajiasu, MAX_xuanguajiao);
        if (carbodyRotationz == MAX_xuanguajiao) {
            isAccelerating = true;     // 设置为加速状态
        }
    }
    //按下 s ，并且车没有处于刹车状态时
    if (keyPressed.s && !isBraking) {
        // carbodyRotationz = MIN_xuanguajiao;
        carbodyRotationz = Math.max(carbodyRotationz - xuanguajiasu, MIN_xuanguajiao);
        if (carbodyRotationz == MIN_xuanguajiao) {
            isBraking = true;     // 设置为刹车状态
        }
    }
    if (isAccelerating) {
        //悬挂抬头后车身回正，回正系数 0.98
        carbodyRotationz *= 0.98;
        if (Math.abs(carbodyRotationz) < 0.001) {
            carbodyRotationz = 0;
        }
    }
    if (isBraking) {
        //刹车后悬挂点头，刹车回正系数 0.8
        carbodyRotationz *= 0.8;
        if (Math.abs(carbodyRotationz) < 0.002) {
            carbodyRotationz = 0;
        }
    }
    if (!keyPressed.w) {
        isAccelerating = false;
    }
    if (!keyPressed.s) {
        isBraking = false;
    }
    // 平滑过渡到目标角度
    // carbodyRotationz = THREE.MathUtils.lerp(
    //     0,
    //     carbodyRotationz,
    //     xuanguajiao * deltaTime * 60 // 帧率补偿
    // );
    carbodyParent.rotation.z = carbodyRotationz;
}


//每帧更新控制器
function animate() {

    requestAnimationFrame(animate);  // 在下一帧渲染时再次调用该函数
    
    // 添加 mixer 更新
    if (mixer) {
        const deltaTime = clock.getDelta();
        mixer.update(deltaTime);
      }
      
    controls.update();

    //打印摄像机位置
    // console.log(camera.position);

    // // 帧率控制
    // if (timestamp - lastFrameTime < FRAME_INTERVAL) return;
    // lastFrameTime = timestamp;
  
    //车轮键盘控制开始3   ***************************
    
    //等待加载模型
    if (!isModelLoaded) return; 
    if (!zuoqianlun || !youqianlun || !zuohoulun || !youhoulun) return;

    // ===== 新增：强制更新车辆的世界矩阵 =====
    carParent.updateMatrixWorld();

    //计算车辆的朝向,重用这个值，方便后面重复使用
    forwardDirection = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(carParent.quaternion)
        .normalize();

    // --- 处理轮胎旋转（前进/后退） ---按下w后车身有个翘起的惯性悬挂动作，停止后有个前压的动作
    if (keyPressed.w) {
        WHEEL_SPEED = Math.max(WHEEL_SPEED - jiasudu , -MAX_WHEEL_SPEED);
        //车头翘起
        // carbodyRotationz = Math.min(carbodyRotationz + xuanguajiao, MAX_xuanguajiao);
    } 
    if (keyPressed.s) {
        WHEEL_SPEED = Math.min(WHEEL_SPEED + jiasudu , MAX_WHEEL_SPEED);
        //车头压下去
        // carbodyRotationz = Math.max(carbodyRotationz - xuanguajiao, -MAX_xuanguajiao);
        //刹车灯亮度变成 10
        backlightIntensity = 10;
    } 
    if (!keyPressed.w && !keyPressed.s) {
        //松开后慢慢减速到 0
        WHEEL_SPEED *= 0.95;
        if (Math.abs(WHEEL_SPEED) < 0.01) {
            WHEEL_SPEED = 0;
        }
        //刹车灯变成 0
        backlightIntensity *= 0.95;
        if (Math.abs(backlightIntensity) < 0.002) {
            backlightIntensity = 0;
        }
    }
    //如果同时按下 w 和 s，则速度慢慢变成0
    if (keyPressed.w && keyPressed.s) {
        WHEEL_SPEED *= 0.8;
        if (Math.abs(WHEEL_SPEED) < 0.01) {
            WHEEL_SPEED = 0;
        }
        //悬挂变成0
        carbodyRotationz *= 0.95;
        if (Math.abs(carbodyRotationz) < 0.002) {
            carbodyRotationz = 0;
        }
        //刹车灯变成 0
        backlightIntensity *= 0.95;
        if (Math.abs(backlightIntensity) < 0.002) {
            backlightIntensity = 0;
        }
    }
    
    //执行车前后移动函数
    moveCar(carParent, forwardDirection, WHEEL_SPEED)
    
    // 如果按下了 w键前进，按下s 键后退，轮胎跟着转，车也跟着前后运动
    zuoqianlun.rotation.z += WHEEL_SPEED;
    youqianlun.rotation.z += WHEEL_SPEED;
    zuohoulun.rotation.z += WHEEL_SPEED;
    youhoulun.rotation.z += WHEEL_SPEED;
    
    //刹车灯亮起，设置backlightMaterial的发光强度
    backlightMaterial.emissiveIntensity = backlightIntensity;
    
    
    // 使用车身悬挂函数
    update_xuangua()   
    
    
    
    // --- 处理轮胎转向（左转/右转） ---
    // 如果按下了 A 键（左转）
    if (keyPressed.a) {
        zuoqianlunParent.rotation.y += TURN_ANGLE;  // 左前轮向左转
        zuoqianlunParent.rotation.y = Math.min(zuoqianlunParent.rotation.y,0.7);    // 限制最大旋转角度
        youqianlunParent.rotation.y += TURN_ANGLE; // 右前轮向左转
        youqianlunParent.rotation.y = Math.min(youqianlunParent.rotation.y,0.7);    // 限制最大旋转角度
    }
    // 如果按下了 D 键（右转）
    if (keyPressed.d) {
        zuoqianlunParent.rotation.y -= TURN_ANGLE;    // 左前轮向右转
        zuoqianlunParent.rotation.y = Math.max(zuoqianlunParent.rotation.y,-0.7);    // 限制最大旋转角度
        youqianlunParent.rotation.y -= TURN_ANGLE;  // 右前轮向右转
        youqianlunParent.rotation.y = Math.max(youqianlunParent.rotation.y,-0.7);    // 限制最大旋转角度
    }
    
    // --- 松开转向键后轮胎自动回正 ---
    // 如果 A 和 D 都没按下，缓慢变成 0
    if (!keyPressed.a && !keyPressed.d) {
        zuoqianlunParent.rotation.y *= 0.9;  // 慢慢回到原始角度
        youqianlunParent.rotation.y *= 0.9;
        
        //车身回正
        carbodyRotationx *= 0.95;
        if (Math.abs(carbodyRotationx) < 0.002) {
            carbodyRotationx = 0;
        }
        
    }
    //如果同时按了a和d，轮胎慢慢回正
    if (keyPressed.a && keyPressed.d) {
        zuoqianlunParent.rotation.y *= 0.9;  // 慢慢回到原始角度
        youqianlunParent.rotation.y *= 0.9;
        
        //车身回正
        carbodyRotationx *= 0.95;
        if (Math.abs(carbodyRotationx) < 0.002) {
            carbodyRotationx = 0;
        }
    }
    // 接近零时强制归零, Math.abs 绝对值
    if (Math.abs(zuoqianlunParent.rotation.y) < 0.001) {
        zuoqianlunParent.rotation.y = 0;
        youqianlunParent.rotation.y = 0;
    }
    
    
    //轮胎左转，车子也跟着一起左转,旋转的中心是车中心点左边 1.5m处，w+a车才会左左转
    if (keyPressed.w && keyPressed.a) {
        // --- 计算车辆前进方向 ---上面已经有计算了，重复使用
        // const forwardDirection = new THREE.Vector3(1, 0, 0)
        // .applyQuaternion(carParent.quaternion)
        // .normalize();
        // 计算左转中心点（车头左侧 1.5 米处）
        const leftCenter = new THREE.Vector3()
        .copy(forwardDirection)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2) // 是一个 ​向量方法，表示将当前向量绕指定的轴旋转一定角度,以y 轴为旋转轴，向左旋转 90 度
        .multiplyScalar(carRadius)
        .add(carParent.position);
        
        // 计算绕左转中心的角速度
        const angularSpeed = zuoqianlunParent.rotation.y * carTurnFactor;
        
        // console.log(leftCenter);
        
        
        // 这是一个更新车辆位置和旋转的函数，函数写写在上面
        rotateAroundPoint(carParent, leftCenter, angularSpeed);
        
        //车身向右摆动
        carbodyRotationx= Math.min(carbodyRotationx + xuanguajiao, MAX_xuanguajiao); 
    }
    //轮胎右转，车子也跟着一起右转,旋转的中心是车中心点右边 1.5m处，w+d车才会左右转
    if (keyPressed.w && keyPressed.d) {
        // --- 计算车辆前进方向 ---上面已经有计算了，重复使用
        const rightCenter = new THREE.Vector3()
        .copy(forwardDirection)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2) // 是一个 ​向量方法，表示将当前向量绕指定的轴旋转一定角度, 以y 轴为旋转轴，向右旋转 90 度
        .multiplyScalar(carRadius)
        .add(carParent.position);
        
        // 计算绕左转中心的角速度
        const angularSpeed = zuoqianlunParent.rotation.y * carTurnFactor;
        
        // 这是一个更新车辆位置和旋转的函数，函数写在上面
        rotateAroundPoint(carParent, rightCenter, angularSpeed);
        
        //车身向右摆动
        carbodyRotationx= Math.max(carbodyRotationx - xuanguajiao, -MAX_xuanguajiao);
    }
    //车倒车,同时按住 s+a 或者 s+d，时，车才会左右反着转
    if (keyPressed.s && keyPressed.a) {
        // --- 计算车辆前进方向 ---上面已经有计算了，重复使用
        const leftCenter = new THREE.Vector3()
        .copy(forwardDirection)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2) // 是一个 ​向量方法，表示将当前向量绕指定的轴旋转一定角度,以y 轴为旋转轴，向左旋转 90 度
        .multiplyScalar(carRadius)
        .add(carParent.position);
        
        // 计算绕左转中心的角速度
        const angularSpeed = -zuoqianlunParent.rotation.y * carTurnFactor;
        
        // 这是一个更新车辆位置和旋转的函数，函数写写在上面
        rotateAroundPoint(carParent, leftCenter, angularSpeed);
        
        //车身向右摆动
        carbodyRotationx= Math.min(carbodyRotationx + xuanguajiao, MAX_xuanguajiao); 
    }
    if (keyPressed.s && keyPressed.d) {
        // --- 计算车辆前进方向 ---上面已经有计算了，重复使用
        const rightCenter = new THREE.Vector3()
        .copy(forwardDirection)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2) // 是一个 ​向量方法，表示将当前向量绕指定的轴旋转一定角度, 以y 轴为旋转轴，向右旋转 90 度
        .multiplyScalar(carRadius)
        .add(carParent.position);
        
        // 计算绕左转中心的角速度
        const angularSpeed = -zuoqianlunParent.rotation.y * carTurnFactor;
        
        // 这是一个更新车辆位置和旋转的函数，函数写在上面
        rotateAroundPoint(carParent, rightCenter, angularSpeed);
        
        //车身向右摆动
        carbodyRotationx= Math.max(carbodyRotationx - xuanguajiao, -MAX_xuanguajiao);
    }
    
    
    //按下a+w或d+w后，或者按下s+a或s+d后，设置车身左右摆动
    carbodyParent.rotation.x = carbodyRotationx;
    
    
    //当轮胎速度WHEEL_SPEED不等于0时，设置相机跟随汽车carParent一起偏移
    if (WHEEL_SPEED !== 0) {
        const cameraPosition = new THREE.Vector3();
        cameraPosition.copy(carParent.position).add(cameraOffset);
        camera.position.lerp(cameraPosition, 0.1);     // 平滑过渡
        // camera.lookAt(carbodyParent.position);     //不生效了
    }
    //当轮胎速度WHEEL_SPEED等于0时，相机恢复控制，并且计算相机跟车的差值
    if (WHEEL_SPEED === 0) {
        cameraOffset.copy(camera.position).sub(carParent.position)
        // controls.update();
    }
    
    // 更新控制器目标点，目标点为车中心点位置
    // 获取车中心点的世界坐标
    // 强制更新车辆及其子级的世界矩阵
    carParent.updateMatrixWorld(true); // 这个 true 表示强制更新所有子级
    // 获取车中心点的世界坐标
    const targetPosition = new THREE.Vector3();
    car_center_point.getWorldPosition(targetPosition);
    
    // 更新控制器目标点
    controls.target.copy(targetPosition);
    
    //车轮键盘控制结束3   ***************************
    
    TWEEN.update();  // 更新 tween 动画
    
    // renderer.render(scene, camera);  // 渲染场景
    
    // 替换原有的渲染调用
    composer.render(scene, camera);  // 使用后期处理器
    
    // console.log('WHEEL_SPEED', WHEEL_SPEED);


    // 检查门安全的函数，如果车门打开，且速度大于0，则执行关门函数。
    checkDoorSafety()    
    
}
animate()


//底部三个摄像机状态的切换按钮操作
//获取三个切换按钮 
const cameraButtons = document.querySelectorAll('.Camera_Control');   // 获取所有 class 为 Camera_Control 的元素
//获取三个 banner
const roll_ul = document.querySelectorAll('.banner_s');

//给每个标签添加一个点击事件,历遍 class 为Product_nav_li的元素
cameraButtons.forEach(function (button,index) {
    button.addEventListener('click',function () {
        //先历遍每个标签，给每个标签先移除点击激活状态 class 为 active
        cameraButtons.forEach(function (btn) {
            btn.classList.remove('active');
        })
        //再给点击的标签添加激活状态
        this.classList.add('active');
        
        //隐藏所有板块
        roll_ul.forEach(function (rollitem) {
            rollitem.style.display = 'none'
        });
        //显示对应的板块
        roll_ul[index].style.display = 'flex'
        
        // 三个按钮对应上面的三个摄像机镜头位置切换，也就是按键 1,2,3 触发的效果
        if (index < 3) { // 只处理前3个按钮对应1-3键
            // 直接调用对应场景的回调
            sences[index].callback();
        }
    })
})
//全局监听，如果点了按钮或者 bannner 外的区域，这个按钮恢复成未激活状态
document.addEventListener('click', function(event) {
    // 检查点击目标是否是按钮或 banner 的组成部分
    const isButton = Array.from(cameraButtons).some(btn => 
        btn.contains(event.target)
    );
    const isBanner = Array.from(roll_ul).some(banner => 
        banner.contains(event.target)
    );

    // 如果点击的是非按钮且非 banner 区域
    if (!isButton && !isBanner) {
        // 移除所有按钮激活状态
        cameraButtons.forEach(btn => btn.classList.remove('active'));
        // 隐藏所有 banner
        roll_ul.forEach(banner => banner.style.display = 'none');
    }
});

//右边三个车漆切换操作
// 获取三个车漆切换按钮
const colorselect = document.querySelectorAll('.colorselect_s');
// 初始化默认颜色（第一个按钮激活），这个已经写在了animate中，初始化默认材质那里，所以这里不用再写一次了
// colorselect[0].classList.add('active');
//给每个车漆按钮添加一个点击事件
colorselect.forEach(function (color,index) {
    color.addEventListener('click',function () {
        //先历遍每个标签，给每个标签先移除点击激活状态 class 为 active
        colorselect.forEach(function (btn) {
            btn.classList.remove('active');
        })
        //再给点击的标签添加激活状态
        this.classList.add('active');
        
        //切换车漆
        // 获取颜色值并转换格式
        const colorHex = this.dataset.color;
        const threeColor = new THREE.Color(colorHex);
        
        // 更新车身材质
        if(carbodyMaterial) {
            carbodyMaterial.color.copy(threeColor);
            
            // 如果是PBR材质，可以同时调整金属度和粗糙度
            carbodyMaterial.metalness = 0.95;  // 高金属度表现车漆质感
            carbodyMaterial.roughness = 0.3;   // 中等粗糙度
            carbodyMaterial.needsUpdate = true; // 确保材质更新
        }
    })
})





// 播放码表速度的雪碧图（修改版）
let frameData1 = [], frameData2 = [];
let isMaxSpeedReached = false; // 是否达到极速状态
let speedAnimation2Frame = 0; // 第二个雪碧图的当前帧,从第 0帧开始
const MAX_SPEED_KMH = 120; // 最大显示速度120km/h

// 加载两个雪碧图的JSON配置
Promise.all([
    fetch('textures/speedanimation1.json').then(r => r.json()),     //浏览器内置方法，用于发起网络请求，加载 json
    fetch('textures/speedanimation2.json').then(r => r.json())        // 并将响应内容解析为JSON格式
  ]).then(([data1, data2]) => {                              
    frameData1 = Object.values(data1.frames);               // 获取帧数据,将JSON中的frames对象转换为数组
    frameData2 = Object.values(data2.frames);
    initSpeedAnimation(); // 数据全部加载完成后初始化
  });


function initSpeedAnimation() {
    const element1 = document.getElementById('speedanimation1');
    const element2 = document.getElementById('speedanimation2');
    
    // 根据速度更新动画
    function updateSpeedAnimation() {
        // 将轮胎速度转换为km/h（MAX_WHEEL_SPEED=0.7对应120km/h）
        const speedKmh = Math.min(
            (Math.abs(WHEEL_SPEED) / MAX_WHEEL_SPEED) * MAX_SPEED_KMH, 
            MAX_SPEED_KMH
        );
        
        // 更新第一个雪碧图（0-120km/h）
        if (!isMaxSpeedReached) {
            const frameIndex = Math.min(
                Math.floor((speedKmh / MAX_SPEED_KMH) * frameData1.length),
                frameData1.length - 1
              );
            updateFrame(element1, frameData1[frameIndex]);      // 更新第一个雪碧图,这是一个函数，写在下面
        }

        // 极速状态处理
        if (speedKmh >= MAX_SPEED_KMH && !isMaxSpeedReached) {
            isMaxSpeedReached = true;
            element1.style.display = 'none';
            element2.style.display = 'block';
        } else if (speedKmh < MAX_SPEED_KMH && isMaxSpeedReached) {
            isMaxSpeedReached = false;
            element1.style.display = 'block';
            element2.style.display = 'none';
        }

        // 更新第二个雪碧图（循环播放）
        if (isMaxSpeedReached) {
            speedAnimation2Frame = (speedAnimation2Frame + 1) % frameData2.length;      //​​取模约束​​：当索引超过雪碧图总帧数时，自动归0
            updateFrame(element2, frameData2[speedAnimation2Frame]);             // 更新第二个雪碧图,这是一个函数，写在下面
        }
    }

    // 每100ms更新一次（可以根据需要调整）
    setInterval(updateSpeedAnimation, 25);
}

// 通用更新帧函数
function updateFrame(element, frameData) {
    const frame = frameData.frame;           // 获取雪碧图 js 文件的帧数据
    const spriteSourceSize = frameData.spriteSourceSize;        //获取雪碧图 js 文件的偏移值

    element.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;
    element.style.width = `${frame.w}px`;
    element.style.height = `${frame.h}px`;
    element.style.left = `${spriteSourceSize.x}px`;
    element.style.top = `${spriteSourceSize.y}px`;
}


//启动时左右两个装饰灯的动画
const leftLight = document.getElementById('left_light_img');
const rightLight = document.getElementById('right_light_img');

function startLightAnimation() {
    const imgopacity = Math.min(Math.abs(WHEEL_SPEED) / (MAX_WHEEL_SPEED * 0.08), 1);
    const translateValue = imgopacity * 80; // 计算偏移量数值
    
    // 合并所有 transform 属性 (注意单位 px 和空格分隔)
    leftLight.style.opacity = imgopacity * 0.9;
    leftLight.style.transform = `translateX(${-translateValue}px) scale(${imgopacity/12 + 1})`;
    rightLight.style.opacity = imgopacity * 0.9;
    rightLight.style.transform = `translateX(${translateValue}px) scale(${imgopacity/12 + 1})`;
}
setInterval(startLightAnimation,100)
