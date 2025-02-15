/*
 * @Author: yueshengqi
 * @Date: 2025-02-15 11:40:18
 * @LastEditors: Do not edit
 * @LastEditTime: 2025-02-15 12:03:11
 * @Description: 
 * @FilePath: \CanvasDrawBoard\canvas画图板\有一点用的工具\base.js
 */

// 工具函数
const isNull = val => (
    val === undefined || 
    val === null || 
    val === 'null' || 
    val === '' || 
    val.length < 1
);

const addLog = message => {
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

    getX() { return this.x; }
    getY() { return this.y; }
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
    trapezoid: 42
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
            lineCap: "round"
        };

        // 控制配置
        this.ctrlConfig = {
            kind: 0,
            isPainting: false,
            startPoint: null,
            cuGraph: null,
            cuPoint: null,
            vertex: []
        };

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
        this.canvas.addEventListener('mousedown', this.mouseDown);
        this.canvas.addEventListener('mousemove', this.mouseMove);
        this.canvas.addEventListener('mouseup', this.mouseUp);
        this.canvas.addEventListener('mouseout', this.mouseOut);
        // 添加右键点击事件
        this.canvas.addEventListener('contextmenu', (e) => {
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
        this.imageHandler.clear();
    }

    // 开始绘制特定图形
    begin(kind) {
        if (this.ctrlConfig.kind !== kind) {
            this.stopDrawing();
            this.ctrlConfig.kind = kind;
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

    // 鼠标事件处理方法
    mouseDown(e) {
        const point = new Point(e.offsetX, e.offsetY);
        
        if (this.ctrlConfig.kind === GraphKind.poly) {
            if (!this.ctrlConfig.isPainting) {
                // 第一次点击，开始绘制
                this.ctrlConfig.isPainting = true;
                this.ctrlConfig.startPoint = point;
                this.ctrlConfig.vertex = [point];
            } else {
                // 添加新顶点
                this.ctrlConfig.vertex.push(point);
            }
            return;
        }

        this.ctrlConfig.isPainting = true;
        this.ctrlConfig.startPoint = point;
        
        if (this.ctrlConfig.kind === GraphKind.pen) {
            this.ctx.beginPath();
            this.ctx.moveTo(point.getX(), point.getY());
        }
    }

    mouseMove(e) {
        if (!this.ctrlConfig.isPainting) return;
        
        const point = new Point(e.offsetX, e.offsetY);
        this.ctrlConfig.cuPoint = point;

        if (this.ctrlConfig.kind === GraphKind.poly) {
            if (this.ctrlConfig.vertex.length > 0) {
                this.clear();
                this.drawBackground();
                
                // 绘制完整的多边形
                this.ctx.beginPath();
                const startPoint = this.ctrlConfig.vertex[0];
                this.ctx.moveTo(startPoint.getX(), startPoint.getY());
                
                // 绘制已有的顶点
                for (let p of this.ctrlConfig.vertex) {
                    this.ctx.lineTo(p.getX(), p.getY());
                }
                
                // 连接到当前鼠标位置
                this.ctx.lineTo(point.getX(), point.getY());
                // 闭合回到起点
                this.ctx.lineTo(startPoint.getX(), startPoint.getY());
                this.ctx.stroke();
            }
            return;
        }

        // 其他工具的处理逻辑保持不变
        if (this.ctrlConfig.kind !== GraphKind.pen) {
            this.clear();
            this.drawBackground();
        }

        switch (this.ctrlConfig.kind) {
            case GraphKind.pen:
                this.drawPen(point);
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

    mouseUp(e) {
        if (this.ctrlConfig.kind === GraphKind.poly) {
            // 多边形不在mouseUp时结束绘制
            return;
        }
        this.stopDrawing();
    }

    mouseOut() {
        if (this.ctrlConfig.kind === GraphKind.poly) {
            // 多边形不在mouseOut时结束绘制
            return;
        }
        this.stopDrawing();
    }

    stopDrawing() {
        if (!this.ctrlConfig.isPainting) return;
        
        this.ctrlConfig.isPainting = false;
        
        // 完成当前绘制
        if (this.ctrlConfig.kind === GraphKind.pen) {
            this.ctx.closePath();
        }
        
        this.ctrlConfig.startPoint = null;
        this.ctrlConfig.cuPoint = null;
        this.ctrlConfig.cuGraph = null;
        this.ctrlConfig.vertex = [];
    }

    // 切换鼠标样式
    switchCursor(isDrawing) {
        this.canvas.style.cursor = isDrawing ? 'crosshair' : 'default';
    }

    // 绘制方法
    drawPen(point) {
        this.ctx.lineTo(point.getX(), point.getY());
        this.ctx.stroke();
        // 不需要更新起点，因为lineTo会自动连接到上一个点
    }

    drawLine() {
        if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;
        
        this.clear();
        this.drawBackground();
        this.ctx.beginPath();
        this.ctx.moveTo(this.ctrlConfig.startPoint.getX(), this.ctrlConfig.startPoint.getY());
        this.ctx.lineTo(this.ctrlConfig.cuPoint.getX(), this.ctrlConfig.cuPoint.getY());
        this.ctx.stroke();
    }

    drawTriangle() {
        if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;
        
        this.clear();
        this.drawBackground();
        
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
        
        this.clear();
        this.drawBackground();
        
        const width = this.ctrlConfig.cuPoint.getX() - this.ctrlConfig.startPoint.getX();
        const height = this.ctrlConfig.cuPoint.getY() - this.ctrlConfig.startPoint.getY();
        
        this.ctx.strokeRect(
            this.ctrlConfig.startPoint.getX(),
            this.ctrlConfig.startPoint.getY(),
            width,
            height
        );
    }

    drawCircle() {
        if (!this.ctrlConfig.startPoint || !this.ctrlConfig.cuPoint) return;
        
        this.clear();
        this.drawBackground();
        
        const radius = Math.sqrt(
            Math.pow(this.ctrlConfig.cuPoint.getX() - this.ctrlConfig.startPoint.getX(), 2) +
            Math.pow(this.ctrlConfig.cuPoint.getY() - this.ctrlConfig.startPoint.getY(), 2)
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
        
        this.clear();
        this.drawBackground();
        
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
        
        this.clear();
        this.drawBackground();
        
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
        
        this.clear();
        this.drawBackground();
        
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
            if (this.ctrlConfig.vertex.length >= 3) {  // 确保至少有3个点才形成多边形
                this.clear();
                this.drawBackground();
                this.ctx.beginPath();
                const startPoint = this.ctrlConfig.vertex[0];
                this.ctx.moveTo(startPoint.getX(), startPoint.getY());
                
                for (let p of this.ctrlConfig.vertex) {
                    this.ctx.lineTo(p.getX(), p.getY());
                }
                
                this.ctx.closePath();
                this.ctx.stroke();
            }
            this.stopDrawing();
        }
    }

    // 添加重绘图形的方法
    redrawShapes() {
        // 这里添加重绘所有绘制图形的逻辑
        // 可以维护一个图形数组，在这里重绘
    }
}
