/*
 * @Author: yueshengqi
 * @Date: 2025-02-15 12:06:22
 * @LastEditors: Do not edit
 * @LastEditTime: 2025-02-15 20:34:04
 * @Description: 
 * @FilePath: \CanvasDrawBoard\canvas画图板\有一点用的工具\imageHandler.js
 */
class ImageHandler {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.bgPic = null;
        
        this.config = {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            lastX: 0,
            lastY: 0
        };

        this.init();
    }

    init() {
        // 只保留缩放和右键拖拽事件
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    }

    handleContextMenu(e) {
        e.preventDefault(); // 阻止默认右键菜单
    }

    handleMouseDown(e) {
        // 只响应右键
        if (e.button !== 2 || !this.bgPic) return;
        
        e.preventDefault();
        this.config.isDragging = true;
        this.config.lastX = e.offsetX;
        this.config.lastY = e.offsetY;
        this.canvas.style.cursor = 'grabbing';
    }

    handleMouseMove(e) {
        if (!this.config.isDragging) return;
        
        e.preventDefault();
        const deltaX = e.offsetX - this.config.lastX;
        const deltaY = e.offsetY - this.config.lastY;

        // 添加边界限制
        const newOffsetX = this.config.offsetX + deltaX;
        const newOffsetY = this.config.offsetY + deltaY;

        // 计算边界
        const maxOffsetX = this.canvas.width;
        const maxOffsetY = this.canvas.height;
        const minOffsetX = -this.bgPic.width * this.config.scale;
        const minOffsetY = -this.bgPic.height * this.config.scale;

        // 应用边界限制
        this.config.offsetX = Math.min(maxOffsetX, Math.max(minOffsetX, newOffsetX));
        this.config.offsetY = Math.min(maxOffsetY, Math.max(minOffsetY, newOffsetY));

        this.config.lastX = e.offsetX;
        this.config.lastY = e.offsetY;

        this.redrawAll();
    }

    handleMouseUp(e) {
        if (this.config.isDragging) {
            e.preventDefault();
            this.config.isDragging = false;
            this.canvas.style.cursor = 'default';
        }
    }

    handleWheel(e) {
        if (!this.bgPic) return;
        
        e.preventDefault();
        
        // 获取鼠标在canvas中的实际位置
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 计算鼠标在图片坐标系中的位置
        const mouseImgX = (mouseX - this.config.offsetX) / this.config.scale;
        const mouseImgY = (mouseY - this.config.offsetY) / this.config.scale;

        // 确定缩放方向和比例，限制最大最小缩放
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const minScale = 0.1;
        const maxScale = 5;
        const newScale = Math.max(minScale, Math.min(maxScale, this.config.scale * delta));
        
        // 如果缩放比例没有变化，不进行重绘
        if (newScale === this.config.scale) return;
        
        // 计算新的偏移量，保持鼠标位置不变
        this.config.offsetX = mouseX - mouseImgX * newScale;
        this.config.offsetY = mouseY - mouseImgY * newScale;
        
        this.config.scale = newScale;
        
        this.redrawAll();
        addLog(`图片缩放: ${Math.round(newScale * 100)}%`);
    }

    drawBackground() {
        if (this.bgPic) {
            // 单独绘制背景图，不受图元绘制的影响
            this.ctx.save();
            this.ctx.setTransform(
                this.config.scale, 0,
                0, this.config.scale,
                this.config.offsetX, this.config.offsetY
            );
            this.ctx.drawImage(this.bgPic, 0, 0);
            this.ctx.restore();
        }
    }

    redrawAll() {
        this.clear();
        
        // 先绘制背景图
        this.drawBackground();
        
        // 重绘其他内容，传递变换信息
        if (window.drawingTools) {
            window.drawingTools.redrawShapes(this.config);
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setBgPic(url) {
        const img = new Image();
        img.onload = () => {
            this.bgPic = img;
            this.fitImageToCanvas();
            this.redrawAll();
            addLog(`已上传背景图片: ${Math.round(this.config.scale * 100)}%`);
        };
        img.src = url;
    }

    // 添加图片自适应方法
    fitImageToCanvas() {
        if (!this.bgPic) return;

        // 获取画布和图片的尺寸
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const imageWidth = this.bgPic.width;
        const imageHeight = this.bgPic.height;

        // 计算适应画布的缩放比例
        const scaleX = canvasWidth / imageWidth;
        const scaleY = canvasHeight / imageHeight;
        
        // 选择较小的缩放比例，确保图片完全显示在画布内
        this.config.scale = Math.min(scaleX, scaleY) * 0.9; // 留出一些边距

        // 计算居中位置
        this.config.offsetX = (canvasWidth - imageWidth * this.config.scale) / 2;
        this.config.offsetY = (canvasHeight - imageHeight * this.config.scale) / 2;
    }

    // 获取当前变换矩阵
    getTransform() {
        return {
            scale: this.config.scale,
            offsetX: this.config.offsetX,
            offsetY: this.config.offsetY
        };
    }

    clearBackground() {
        this.bgPic = null;
        this.config.scale = 1;
        this.config.offsetX = 0;
        this.config.offsetY = 0;
    }
}
