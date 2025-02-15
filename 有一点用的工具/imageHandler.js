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
        // 添加事件监听
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('mousedown', this.handleDragStart.bind(this));
        this.canvas.addEventListener('mousemove', this.handleDragMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleDragEnd.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleDragEnd.bind(this));
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

        // 确定缩放方向和比例
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(5, this.config.scale * delta));
        
        // 计算新的偏移量，保持鼠标位置不变
        this.config.offsetX = mouseX - mouseImgX * newScale;
        this.config.offsetY = mouseY - mouseImgY * newScale;
        
        this.config.scale = newScale;
        
        this.redrawAll();
        addLog(`图片缩放: ${Math.round(newScale * 100)}%`);
    }

    handleDragStart(e) {
        if (!this.bgPic || window.drawingTools.ctrlConfig.isPainting) return;
        
        e.preventDefault();
        
        // 获取鼠标在canvas中的位置
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        this.config.isDragging = true;
        this.config.lastX = mouseX;
        this.config.lastY = mouseY;
        
        // 改变鼠标样式
        this.canvas.style.cursor = 'grabbing';
    }

    handleDragMove(e) {
        if (!this.config.isDragging) return;
        
        e.preventDefault();
        
        // 获取鼠标在canvas中的位置
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const deltaX = mouseX - this.config.lastX;
        const deltaY = mouseY - this.config.lastY;
        
        this.config.offsetX += deltaX;
        this.config.offsetY += deltaY;
        
        this.config.lastX = mouseX;
        this.config.lastY = mouseY;
        
        this.redrawAll();
    }

    handleDragEnd(e) {
        if (this.config.isDragging) {
            e.preventDefault();
            this.config.isDragging = false;
            this.canvas.style.cursor = 'default';
        }
    }

    drawBackground() {
        if (this.bgPic) {
            this.ctx.save();
            this.ctx.translate(this.config.offsetX, this.config.offsetY);
            this.ctx.scale(this.config.scale, this.config.scale);
            this.ctx.drawImage(this.bgPic, 0, 0);
            this.ctx.restore();
        }
    }

    redrawAll() {
        this.clear();
        this.drawBackground();
        // 重绘其他内容
        if (window.drawingTools) {
            window.drawingTools.redrawShapes();
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setBgPic(url) {
        const img = new Image();
        img.onload = () => {
            this.bgPic = img;
            this.config.scale = 1;
            this.config.offsetX = 0;
            this.config.offsetY = 0;
            this.redrawAll();
        };
        img.src = url;
    }
}
