/*
 * @Author: yueshengqi
 * @Date: 2025-02-15 11:40:18
 * @LastEditors: Do not edit
 * @LastEditTime: 2025-02-15 21:14:01
 * @Description:
 * @FilePath: \CanvasDrawBoard\canvas画图板\有一点用的工具\base.js
 */

// 工具函数
const isNull = (val) =>
  val === undefined ||
  val === null ||
  val === "null" ||
  val === "" ||
  val.length < 1;

const addLog = (message) => {
  const logContent = document.getElementById("logContent");
  const logEntry = document.createElement("div");
  logEntry.style.marginBottom = "5px";
  logEntry.textContent = message;
  logContent.insertBefore(logEntry, logContent.firstChild);
};

// 点类
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  setXY(x, y) {
    this.x = x;
    this.y = y;
  }

  getX() {
    return this.x;
  }
  getY() {
    return this.y;
  }
}

// 图形类型枚举
const GraphKind = {
  cursor: 0,
  pen: 1,
  line: 2,
  trian: 3,
  rect: 4,
  poly: 5,
  circle: 6,
  arrow: 21,
  parallel: 41,
  trapezoid: 42,
};

// 绘图工具类
class DrawingTools {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.backgroundImage = null;

    // 绘图配置
    this.paintConfig = {
      lineWidth: 1,
      strokeStyle: "#ff0000",
      fillStyle: "#ff0000",
      lineJoin: "round",
      lineCap: "round",
    };

    // 控制配置
    this.ctrlConfig = {
      kind: 0,
      isPainting: false,
      startPoint: null,
      cuGraph: null,
      cuPoint: null,
      vertex: [],
    };

    // 添加图形存储数组
    this.shapes = [];

    // 添加撤销栈
    this.undoStack = [];

    // 添加保留历史配置
    this.keepHistory = true;

    // 绑定方法到实例
    this.mouseDown = this.mouseDown.bind(this);
    this.mouseMove = this.mouseMove.bind(this);
    this.mouseUp = this.mouseUp.bind(this);
    this.mouseOut = this.mouseOut.bind(this);
  }

  // 初始化方法
  init({ id }) {
    this.canvas = document.getElementById(id);
    if (this.canvas.getContext) {
      this.ctx = this.canvas.getContext("2d");
      this.setupEventListeners();
      this.resetStyle();
      this.imageHandler = new ImageHandler(this.canvas, this.ctx);
      window.drawingTools = this;
      return true;
    }
    return false;
  }

  // 设置事件监听
  setupEventListeners() {
    this.canvas.addEventListener("mousedown", this.mouseDown);
    this.canvas.addEventListener("mousemove", this.mouseMove);
    this.canvas.addEventListener("mouseup", this.mouseUp);
    this.canvas.addEventListener("mouseout", this.mouseOut);
    // 添加右键点击事件
    this.canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault(); // 阻止默认右键菜单
      if (this.ctrlConfig.kind === GraphKind.poly) {
        this.finishPolygon();
      }
    });
  }

  // 重置样式
  resetStyle() {
    Object.assign(this.ctx, this.paintConfig);
  }

  // 清除画布
  clear() {
    this.shapes = [];
    this.undoStack = [];
    this.imageHandler.clear();
    this.imageHandler.clearBackground();
    addLog("已清除所有内容");
  }

  // 开始绘制特定图形
  begin(kind) {
    if (this.ctrlConfig.kind !== kind) {
      // 完全重置状态
      this.ctx.beginPath();
      this.ctx.closePath();
      
      // 重置所有控制状态
      this.ctrlConfig.isPainting = false;
      this.ctrlConfig.startPoint = null;
      this.ctrlConfig.cuPoint = null;
      this.ctrlConfig.cuGraph = null;
      this.ctrlConfig.vertex = [];
      
      // 清除并重绘
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawBackground();
      this.redrawShapes(this.imageHandler.getTransform());
      
      // 设置新的绘制模式
      this.ctrlConfig.kind = kind;
      
      // 重置样式
      this.resetStyle();
      
      this.switchCursor(true);
      addLog(`选择绘制图形: ${kind}`);
    }
  }

  // 设置颜色
  setColor(color) {
    this.paintConfig.strokeStyle = color;
    this.paintConfig.fillStyle = color;
    this.resetStyle();
    addLog(`设置颜色: ${color}`);
  }

  // 设置线宽
  setLineWidth(width) {
    this.paintConfig.lineWidth = width;
    this.resetStyle();
    addLog(`设置线宽: ${width}`);
  }

  // 设置背景图片
  setBgPic(url) {
    this.imageHandler.setBgPic(url);
  }

  // 绘制背景
  drawBackground() {
    this.imageHandler.drawBackground();
  }

  // 转换鼠标坐标到图片坐标系
  transformPoint(x, y) {
    const transform = this.imageHandler.getTransform();
    return new Point(
      (x - transform.offsetX) / transform.scale,
      (y - transform.offsetY) / transform.scale
    );
  }

  mouseDown(e) {
    if (e.button === 2) return;

    const point = this.transformPoint(e.offsetX, e.offsetY);

    if (this.ctrlConfig.kind === GraphKind.poly) {
      if (!this.ctrlConfig.isPainting) {
        // 开始绘制多边形
        this.ctrlConfig.isPainting = true;
        this.ctrlConfig.startPoint = point;
        this.ctrlConfig.vertex = [point];
        addLog("开始绘制多边形");
      } else {
        // 添加新的顶点，但要避免重复添加相同位置的点
        const lastPoint = this.ctrlConfig.vertex[this.ctrlConfig.vertex.length - 1];
        const distance = Math.sqrt(
          Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
        );
        if (distance > 3) { // 添加最小距离判断，避免重复点击
          this.ctrlConfig.vertex.push(point);
          addLog(`添加多边形顶点 ${this.ctrlConfig.vertex.length}`);
        }
      }
      return;
    }

    this.ctrlConfig.isPainting = true;
    this.ctrlConfig.startPoint = point;

    if (this.ctrlConfig.kind === GraphKind.pen) {
        const transform = this.imageHandler.getTransform();
        this.ctx.save();
        this.ctx.setTransform(
            transform.scale,
            0,
            0,
            transform.scale,
            transform.offsetX,
            transform.offsetY
        );
        this.ctx.beginPath();
        this.ctx.moveTo(point.getX(), point.getY());
        this.ctx.restore();
    }
  }

  mouseMove(e) {
    if (this.imageHandler.config.isDragging) return;
    
    const point = this.transformPoint(e.offsetX, e.offsetY);
    this.ctrlConfig.cuPoint = point;

    if (!this.ctrlConfig.isPainting && this.ctrlConfig.kind !== GraphKind.poly) {
        return;
    }

    if (this.ctrlConfig.kind === GraphKind.pen && this.ctrlConfig.isPainting) {
        const transform = this.imageHandler.getTransform();
        this.ctx.save();
        this.ctx.setTransform(
            transform.scale,
            0,
            0,
            transform.scale,
            transform.offsetX,
            transform.offsetY
        );
        this.ctx.lineTo(point.getX(), point.getY());
        this.ctx.stroke();
        this.ctx.restore();
        return;
    }

    // 其他图形的处理
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackground();
    
    if (this.keepHistory) {
        this.redrawShapes(this.imageHandler.getTransform());
    }

    const transform = this.imageHandler.getTransform();
    this.ctx.save();
    this.ctx.setTransform(
        transform.scale,
        0,
        0,
        transform.scale,
        transform.offsetX,
        transform.offsetY
    );
    
    this.resetStyle();
    this.drawCurrentShape();
    this.ctx.restore();
  }

  mouseUp(e) {
    if (this.ctrlConfig.kind === GraphKind.poly) return;
    if (!this.ctrlConfig.isPainting) return;

    if (this.ctrlConfig.kind === GraphKind.pen) {
        this.ctx.beginPath();
    }

    // 保存当前绘制的图形
    if (this.ctrlConfig.startPoint && this.ctrlConfig.cuPoint) {
        const newShape = {
            kind: this.ctrlConfig.kind,
            startPoint: { ...this.ctrlConfig.startPoint },
            endPoint: { ...this.ctrlConfig.cuPoint },
            style: { ...this.paintConfig },
            vertices: this.ctrlConfig.vertex ? [...this.ctrlConfig.vertex] : null,
        };
        
        this.shapes.push(newShape);
        // 当新增图形时清空撤销栈
        this.undoStack = [];
    }

    this.stopDrawing();
  }

  mouseOut() {
    // 多边形模式下不处理mouseOut事件
    if (this.ctrlConfig.kind === GraphKind.poly) {
      return;
    }
    this.stopDrawing();
  }

  stopDrawing() {
    if (this.ctrlConfig.kind === GraphKind.poly) return;
    
    if (!this.ctrlConfig.isPainting) return;

    this.ctrlConfig.isPainting = false;

    // 画笔模式下强制结束所有路径
    if (this.ctrlConfig.kind === GraphKind.pen) {
        this.ctx.beginPath();
        this.ctx.closePath();
    }

    this.ctrlConfig.startPoint = null;
    this.ctrlConfig.cuPoint = null;
    this.ctrlConfig.cuGraph = null;
    this.ctrlConfig.vertex = [];
  }

  // 切换鼠标样式
  switchCursor(isDrawing) {
    this.canvas.style.cursor = isDrawing ? "crosshair" : "default";
  }

  // 绘制方法
  drawPen(point) {
    // 画笔的绘制现在完全由 mouseMove 处理
    return;
  }

  drawLine() {
    if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;

    this.ctx.beginPath();
    this.ctx.moveTo(
      this.ctrlConfig.startPoint.getX(),
      this.ctrlConfig.startPoint.getY()
    );
    this.ctx.lineTo(
      this.ctrlConfig.cuPoint.getX(),
      this.ctrlConfig.cuPoint.getY()
    );
    this.ctx.stroke();
  }

  drawTriangle() {
    if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;

    this.drawBackground();

    // 如果开启了保留历史，重绘之前的图形
    if (this.keepHistory) {
      this.redrawShapes(this.imageHandler.getTransform());
    }

    const { startPoint, cuPoint } = this.ctrlConfig;
    const thirdPoint = new Point(
      startPoint.getX() - (cuPoint.getX() - startPoint.getX()),
      cuPoint.getY()
    );

    this.ctx.beginPath();
    this.ctx.moveTo(startPoint.getX(), startPoint.getY());
    this.ctx.lineTo(cuPoint.getX(), cuPoint.getY());
    this.ctx.lineTo(thirdPoint.getX(), thirdPoint.getY());
    this.ctx.closePath();
    this.ctx.stroke();
  }

  drawRectangle() {
    if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;

    this.drawBackground();

    // 如果开启了保留历史，重绘之前的图形
    if (this.keepHistory) {
      this.redrawShapes(this.imageHandler.getTransform());
    }

    const width =
      this.ctrlConfig.cuPoint.getX() - this.ctrlConfig.startPoint.getX();
    const height =
      this.ctrlConfig.cuPoint.getY() - this.ctrlConfig.startPoint.getY();

    this.ctx.strokeRect(
      this.ctrlConfig.startPoint.getX(),
      this.ctrlConfig.startPoint.getY(),
      width,
      height
    );
  }

  drawCircle() {
    if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;

    this.drawBackground();

    // 如果开启了保留历史，重绘之前的图形
    if (this.keepHistory) {
      this.redrawShapes(this.imageHandler.getTransform());
    }

    const radius = Math.sqrt(
      Math.pow(
        this.ctrlConfig.cuPoint.getX() - this.ctrlConfig.startPoint.getX(),
        2
      ) +
        Math.pow(
          this.ctrlConfig.cuPoint.getY() - this.ctrlConfig.startPoint.getY(),
          2
        )
    );

    this.ctx.beginPath();
    this.ctx.arc(
      this.ctrlConfig.startPoint.getX(),
      this.ctrlConfig.startPoint.getY(),
      radius,
      0,
      2 * Math.PI
    );
    this.ctx.stroke();
  }

  drawArrow() {
    if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;

    this.drawBackground();

    // 如果开启了保留历史，重绘之前的图形
    if (this.keepHistory) {
      this.redrawShapes(this.imageHandler.getTransform());
    }

    const { startPoint, cuPoint } = this.ctrlConfig;
    const headlen = 10;
    const dx = cuPoint.getX() - startPoint.getX();
    const dy = cuPoint.getY() - startPoint.getY();
    const angle = Math.atan2(dy, dx);

    this.ctx.beginPath();
    this.ctx.moveTo(startPoint.getX(), startPoint.getY());
    this.ctx.lineTo(cuPoint.getX(), cuPoint.getY());
    this.ctx.lineTo(
      cuPoint.getX() - headlen * Math.cos(angle - Math.PI / 6),
      cuPoint.getY() - headlen * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(cuPoint.getX(), cuPoint.getY());
    this.ctx.lineTo(
      cuPoint.getX() - headlen * Math.cos(angle + Math.PI / 6),
      cuPoint.getY() - headlen * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  drawParallelogram() {
    if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;

    this.drawBackground();

    // 如果开启了保留历史，重绘之前的图形
    if (this.keepHistory) {
      this.redrawShapes(this.imageHandler.getTransform());
    }

    const { startPoint, cuPoint } = this.ctrlConfig;
    const offset = (cuPoint.getX() - startPoint.getX()) / 4;

    this.ctx.beginPath();
    this.ctx.moveTo(startPoint.getX() + offset, startPoint.getY());
    this.ctx.lineTo(cuPoint.getX() + offset, startPoint.getY());
    this.ctx.lineTo(cuPoint.getX(), cuPoint.getY());
    this.ctx.lineTo(startPoint.getX(), cuPoint.getY());
    this.ctx.closePath();
    this.ctx.stroke();
  }

  drawTrapezoid() {
    if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;

    this.drawBackground();

    // 如果开启了保留历史，重绘之前的图形
    if (this.keepHistory) {
      this.redrawShapes(this.imageHandler.getTransform());
    }

    const { startPoint, cuPoint } = this.ctrlConfig;
    const offset = (cuPoint.getX() - startPoint.getX()) / 4;

    this.ctx.beginPath();
    this.ctx.moveTo(startPoint.getX() + offset, startPoint.getY());
    this.ctx.lineTo(cuPoint.getX() - offset, startPoint.getY());
    this.ctx.lineTo(cuPoint.getX(), cuPoint.getY());
    this.ctx.lineTo(startPoint.getX(), cuPoint.getY());
    this.ctx.closePath();
    this.ctx.stroke();
  }

  finishPolygon() {
    if (this.ctrlConfig.kind === GraphKind.poly && this.ctrlConfig.isPainting) {
      if (this.ctrlConfig.vertex.length >= 3) {
        // 保存多边形到shapes数组
        const newShape = {
          kind: GraphKind.poly,
          vertices: [...this.ctrlConfig.vertex],
          style: { ...this.paintConfig }
        };
        
        this.shapes.push(newShape);
        // 当新增图形时清空撤销栈
        this.undoStack = [];

        // 清除画布并重绘所有内容
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
        
        const transform = this.imageHandler.getTransform();
        this.redrawShapes(transform);
        
        addLog("完成多边形绘制");
      } else {
        addLog("多边形至少需要3个顶点");
      }
      
      // 重置绘制状态
      this.ctrlConfig.isPainting = false;
      this.ctrlConfig.startPoint = null;
      this.ctrlConfig.cuPoint = null;
      this.ctrlConfig.vertex = [];
    }
  }

  // 重绘所有图形的方法
  redrawShapes(transform) {
    if (!this.shapes.length) return;

    this.ctx.save();

    // 使用 setTransform 替代 translate 和 scale
    this.ctx.setTransform(
      transform.scale,
      0,
      0,
      transform.scale,
      transform.offsetX,
      transform.offsetY
    );

    // 重绘每个保存的图形
    this.shapes.forEach((shape) => {
      Object.assign(this.ctx, shape.style);

      switch (shape.kind) {
        case GraphKind.pen:
          // 画笔需要特殊处理
          break;
        case GraphKind.line:
          this.ctx.beginPath();
          this.ctx.moveTo(shape.startPoint.x, shape.startPoint.y);
          this.ctx.lineTo(shape.endPoint.x, shape.endPoint.y);
          this.ctx.stroke();
          break;
        case GraphKind.trian:
          this.drawSavedTriangle(shape);
          break;
        case GraphKind.rect:
          this.drawSavedRectangle(shape);
          break;
        case GraphKind.poly:
          if (shape.vertices) {
            this.drawSavedPolygon(shape);
          }
          break;
        case GraphKind.circle:
          this.drawSavedCircle(shape);
          break;
        case GraphKind.arrow:
          this.drawSavedArrow(shape);
          break;
        case GraphKind.parallel:
          this.drawSavedParallelogram(shape);
          break;
        case GraphKind.trapezoid:
          this.drawSavedTrapezoid(shape);
          break;
      }
    });

    this.ctx.restore();
    this.resetStyle();
  }

  // 添加各种图形的重绘方法
  drawSavedTriangle(shape) {
    const thirdPoint = new Point(
      shape.startPoint.x - (shape.endPoint.x - shape.startPoint.x),
      shape.endPoint.y
    );

    this.ctx.beginPath();
    this.ctx.moveTo(shape.startPoint.x, shape.startPoint.y);
    this.ctx.lineTo(shape.endPoint.x, shape.endPoint.y);
    this.ctx.lineTo(thirdPoint.x, thirdPoint.y);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  drawSavedRectangle(shape) {
    const width = shape.endPoint.x - shape.startPoint.x;
    const height = shape.endPoint.y - shape.startPoint.y;
    this.ctx.strokeRect(shape.startPoint.x, shape.startPoint.y, width, height);
  }

  drawSavedPolygon(shape) {
    if (!shape.vertices.length) return;

    this.ctx.beginPath();
    this.ctx.moveTo(shape.vertices[0].x, shape.vertices[0].y);

    for (let i = 1; i < shape.vertices.length; i++) {
      this.ctx.lineTo(shape.vertices[i].x, shape.vertices[i].y);
    }

    this.ctx.closePath();
    this.ctx.stroke();
  }

  drawSavedCircle(shape) {
    const radius = Math.sqrt(
      Math.pow(shape.endPoint.x - shape.startPoint.x, 2) +
        Math.pow(shape.endPoint.y - shape.startPoint.y, 2)
    );

    this.ctx.beginPath();
    this.ctx.arc(
      shape.startPoint.x,
      shape.startPoint.y,
      radius,
      0,
      2 * Math.PI
    );
    this.ctx.stroke();
  }

  drawSavedArrow(shape) {
    const headlen = 10;
    const dx = shape.endPoint.x - shape.startPoint.x;
    const dy = shape.endPoint.y - shape.startPoint.y;
    const angle = Math.atan2(dy, dx);

    this.ctx.beginPath();
    this.ctx.moveTo(shape.startPoint.x, shape.startPoint.y);
    this.ctx.lineTo(shape.endPoint.x, shape.endPoint.y);
    this.ctx.lineTo(
      shape.endPoint.x - headlen * Math.cos(angle - Math.PI / 6),
      shape.endPoint.y - headlen * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(shape.endPoint.x, shape.endPoint.y);
    this.ctx.lineTo(
      shape.endPoint.x - headlen * Math.cos(angle + Math.PI / 6),
      shape.endPoint.y - headlen * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  drawSavedParallelogram(shape) {
    const offset = (shape.endPoint.x - shape.startPoint.x) / 4;

    this.ctx.beginPath();
    this.ctx.moveTo(shape.startPoint.x + offset, shape.startPoint.y);
    this.ctx.lineTo(shape.endPoint.x + offset, shape.startPoint.y);
    this.ctx.lineTo(shape.endPoint.x, shape.endPoint.y);
    this.ctx.lineTo(shape.startPoint.x, shape.endPoint.y);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  drawSavedTrapezoid(shape) {
    const offset = (shape.endPoint.x - shape.startPoint.x) / 4;

    this.ctx.beginPath();
    this.ctx.moveTo(shape.startPoint.x + offset, shape.startPoint.y);
    this.ctx.lineTo(shape.endPoint.x - offset, shape.startPoint.y);
    this.ctx.lineTo(shape.endPoint.x, shape.endPoint.y);
    this.ctx.lineTo(shape.startPoint.x, shape.endPoint.y);
    this.ctx.closePath();
    this.ctx.stroke();
  }

  // 设置是否保留历史
  setKeepHistory(keep) {
    this.keepHistory = keep;
    if (!keep) {
      // 如果关闭历史记录，清空所有已保存的图形
      this.shapes = [];
      this.undoStack = [];
      // 清除画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawBackground();
    }
  }

  // 在 DrawingTools 类中添加 drawCurrentShape 方法
  drawCurrentShape() {
    switch (this.ctrlConfig.kind) {
      case GraphKind.pen:
        if (this.ctrlConfig.cuPoint) {
          this.drawPen(this.ctrlConfig.cuPoint);
        }
        break;
      case GraphKind.line:
        this.drawLine();
        break;
      case GraphKind.trian:
        this.drawTriangle();
        break;
      case GraphKind.rect:
        this.drawRectangle();
        break;
      case GraphKind.poly:
        if (this.ctrlConfig.vertex && this.ctrlConfig.vertex.length > 0) {
          this.ctx.beginPath();
          
          // 绘制已确定的顶点
          this.ctx.moveTo(this.ctrlConfig.vertex[0].x, this.ctrlConfig.vertex[0].y);
          for (let i = 1; i < this.ctrlConfig.vertex.length; i++) {
            this.ctx.lineTo(this.ctrlConfig.vertex[i].x, this.ctrlConfig.vertex[i].y);
          }
          
          // 绘制到当前鼠标位置的预览线
          if (this.ctrlConfig.cuPoint) {
            this.ctx.lineTo(this.ctrlConfig.cuPoint.x, this.ctrlConfig.cuPoint.y);
            
            // 如果顶点数大于2，显示闭合预览
            if (this.ctrlConfig.vertex.length >= 2) {
              // 使用虚线样式显示闭合线
              const originalDash = this.ctx.getLineDash();
              this.ctx.setLineDash([5, 5]);
              this.ctx.lineTo(this.ctrlConfig.vertex[0].x, this.ctrlConfig.vertex[0].y);
              this.ctx.setLineDash(originalDash);
            }
          }
          
          this.ctx.stroke();

          // 绘制顶点标记
          this.ctx.fillStyle = this.paintConfig.strokeStyle;
          this.ctrlConfig.vertex.forEach(point => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            this.ctx.fill();
          });
        }
        break;
      case GraphKind.circle:
        this.drawCircle();
        break;
      case GraphKind.arrow:
        this.drawArrow();
        break;
      case GraphKind.parallel:
        this.drawParallelogram();
        break;
      case GraphKind.trapezoid:
        this.drawTrapezoid();
        break;
    }
  }

  // 撤销功能
  undo() {
    if (this.shapes.length > 0) {
      // 将最后一个图形移到撤销栈
      const lastShape = this.shapes.pop();
      this.undoStack.push(lastShape);
      
      // 清除画布并重绘
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawBackground();
      this.redrawShapes(this.imageHandler.getTransform());
      
      addLog('撤销上一步操作');
    } else {
      addLog('没有可撤销的操作');
    }
  }
}
