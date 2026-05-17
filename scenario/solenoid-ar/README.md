# AI 物理模型实时交互 — 螺线管电磁场（手部 AR 叠加）

通过浏览器摄像头识别手部，把 3D 螺线管电磁场模型 AR 叠加到你的手心上。手势驱动电流强度与方向。

## 功能

- **手部 AR 锚定**：MediaPipe `HandLandmarker` 识别 21 个关键点，螺线管自动跟随手心位置/朝向/缩放（手腕 → 中指根作为螺线管轴）
- **电流可视化**：螺旋上的流动箭头 + 3 个绕轴旋转的环形电流箭头 + 内部轴向粒子流 + 外部磁感线
- **手势映射**
  - 张开手掌 → 基线电流强度
  - 握拳 → 电流增强（线圈和场线变亮）
  - 拇指食指捏合 → 反转电流方向（N/S 极互换）
- **抗闪烁**：缓存上次有效 landmarks，连续 8 帧丢失才报失踪；EMA 平滑位姿；捏合手势边沿触发 + 1s 冷却

## 技术栈

- 纯前端，无打包工具
- Three.js 0.160（importmap 从 unpkg 加载）
- @mediapipe/tasks-vision 0.10.10（jsdelivr 加载 ESM bundle + WASM）
- HandLandmarker 模型来自 Google MediaPipe 公共 CDN

## 文件结构

```
.
├── index.html        # 入口页面 + importmap
├── style.css         # AR 风格暗色 UI
├── src/
│   ├── main.js       # 动画循环、手势 → 场景的绑定
│   ├── scene.js      # Three.js 螺线管 + 电磁场可视化
│   └── hands.js      # MediaPipe 封装 + 手势分类
└── README.md
```

## 启动方式

**必须通过 HTTP 服务器访问**（`file://` 协议无法授予摄像头权限，也无法加载 ES 模块）。任选一种：

### 方式 1：Python（macOS / Linux 自带）

```bash
cd /Users/flm/Documents/flmcode/wuli
python3 -m http.server 8000
```

然后在浏览器打开 <http://localhost:8000/>。

### 方式 2：Node 的 `serve`（如已装）

```bash
cd /Users/flm/Documents/flmcode/wuli
npx serve -p 8000
```

### 方式 3：VS Code 的 Live Server 插件

右键 `index.html` → "Open with Live Server"。

### 浏览器要求

- Chrome / Edge / Safari 现代版本（需支持 WebGL2 + importmap + getUserMedia）
- 第一次打开会弹出**摄像头权限请求**，点"允许"
- 必须是 `localhost` 或 HTTPS，否则浏览器拒绝授予摄像头权限

## 使用步骤

1. 启动服务，浏览器打开页面
2. 允许摄像头权限
3. 把手伸到画面中央，五指张开手心面向镜头
4. 螺线管会出现在掌心，N 极朝向指尖，S 极朝向手腕
5. 试试三个手势：
   - 张开手掌移动 → 模型跟随
   - 握拳 → 线圈变亮（电流增强）
   - 拇指食指捏合 → N/S 极互换 + 环形箭头反向旋转

## 面板状态说明

- **手部检测**
  - 绿色"已检测"：当前视频帧成功识别
  - 黄色"保持/短暂丢失"：暂用缓存关键点（RAF 比视频帧快属正常）
  - 灰色"未检测"：手离开画面或持续丢失
- **当前手势**：实时识别的手势名
- **电流方向**：→ 正向 / ← 反向
- **电流强度**：0.10 ~ 2.50
- **FPS**：渲染帧率

## 常见问题

**Q: 摄像头权限给了但页面没反应？**
检查浏览器地址栏的小相机图标，确认权限是 "允许"。Safari 用户需在"系统设置 → 隐私 → 摄像头"里勾选浏览器。

**Q: 模型没有出现在手上？**
- 确认面板"手部检测"是绿色"已检测"
- 把手放到画面中央，避免太靠边或被身体挡住
- 光线不足会让识别失败，开个灯

**Q: 模型抖动？**
正常 EMA 已经平滑过，如果还是觉得抖，可以把 `src/main.js` 里 `ALPHA_POS / ALPHA_AXIS / ALPHA_SCALE` 调更小（例如 0.12）。

**Q: 想看 AI 看到的手部骨架？**
点面板上的"显示骨架"按钮。

**Q: 网络问题加载不出来？**
CDN 资源走 `unpkg.com` 和 `cdn.jsdelivr.net`，国内偶尔不稳。如有需要可下载到本地后改成相对路径。
