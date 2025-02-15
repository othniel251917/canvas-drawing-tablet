/*
 * @Author: yueshengqi
 * @Date: 2025-02-15 11:40:18
 * @LastEditors: Do not edit
 * @LastEditTime: 2025-02-15 20:24:34
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

        // 添加图形存储数组
        this.shapes = [];

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
        this.shapes = []; // 清除存储的图形
        this.imageHandler.clear(); // 清除画布
        this.imageHandler.clearBackground(); // 清除背景图片
        addLog("已清除所有内容");
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
        
        // 转换鼠标坐标到图片坐标系
        const point = this.transformPoint(e.offsetX, e.offsetY);
        
        if (this.ctrlConfig.kind === GraphKind.poly) {
            if (!this.ctrlConfig.isPainting) {
                this.ctrlConfig.isPainting = true;
                this.ctrlConfig.startPoint = point;
                this.ctrlConfig.vertex = [point];
            } else {
                this.ctrlConfig.vertex.push(point);
            }
            return;
        }

        this.ctrlConfig.isPainting = true;
        this.ctrlConfig.startPoint = point;
        
        if (this.ctrlConfig.kind === GraphKind.pen) {
            this.ctx.beginPath();
            // 在绘制时也需要考虑变换
            const transform = this.imageHandler.config;
            this.ctx.save();
            this.ctx.translate(transform.offsetX, transform.offsetY);
            this.ctx.scale(transform.scale, transform.scale);
            this.ctx.moveTo(point.getX(), point.getY());
            this.ctx.restore();
        }
    }

    mouseMove(e) {
        if (this.imageHandler.config.isDragging) return;
        if (!this.ctrlConfig.isPainting) return;
        
        // 转换鼠标坐标到图片坐标系
        const point = this.transformPoint(e.offsetX, e.offsetY);
        this.ctrlConfig.cuPoint = point;

        // 重绘背景
        this.imageHandler.drawBackground();
        
        // 如果开启了保留历史，则重绘所有已保存的图形
        if (this.keepHistory) {
            this.redrawShapes(this.imageHandler.getTransform());
        }

        // 绘制当前图形
        this.ctx.save();
        const transform = this.imageHandler.getTransform();
        this.ctx.setTransform(
            transform.scale, 0,
            0, transform.scale,
            transform.offsetX, transform.offsetY
        );

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

        this.ctx.restore();
    }

    mouseUp(e) {
        if (!this.ctrlConfig.isPainting) return;
        
        // 保存当前绘制的图形
        if (this.ctrlConfig.startPoint && this.ctrlConfig.cuPoint) {
            this.shapes.push({
                kind: this.ctrlConfig.kind,
                startPoint: { ...this.ctrlConfig.startPoint },
                endPoint: { ...this.ctrlConfig.cuPoint },
                style: { ...this.paintConfig },
                vertices: this.ctrlConfig.vertex ? [...this.ctrlConfig.vertex] : null
            });
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
        
        this.drawBackground();
        
        // 如果开启了保留历史，重绘之前的图形
        if (this.keepHistory) {
            this.redrawShapes(this.imageHandler.getTransform());
        }
        
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

    // 重绘所有图形的方法
    redrawShapes(transform) {
        if (!this.shapes.length) return;
        
        this.ctx.save();
        
        // 使用 setTransform 替代 translate 和 scale
        this.ctx.setTransform(
            transform.scale, 0,
            0, transform.scale,
            transform.offsetX, transform.offsetY
        );
        
        // 重绘每个保存的图形
        this.shapes.forEach(shape => {
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
        this.ctx.arc(shape.startPoint.x, shape.startPoint.y, radius, 0, 2 * Math.PI);
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
    }
}
