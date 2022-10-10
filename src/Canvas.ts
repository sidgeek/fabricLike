import { Util } from "./Util";
// import { Point } from './Point';
// import { FabricObject } from './FabricObject';
// import { Group } from './Group';
// import { Offset, Pos, GroupSelector, CurrentTransform } from './interface';
import { EventCenter } from "./EventCenter";
import { Point } from "./Point";

export class Canvas extends EventCenter {
  /** 画布宽度 */
  public width: number;
  /** 画布高度 */
  public height: number;
  /** 包围 canvas 的外层 div 容器 */
  public wrapperEl: HTMLElement;
  /** 下层 canvas 画布，主要用于绘制所有物体 */
  public lowerCanvasEl: HTMLCanvasElement;
  /** 上层 canvas，主要用于监听鼠标事件、涂鸦模式、左键点击拖蓝框选区域 */
  public upperCanvasEl: HTMLCanvasElement;
  /** 上层画布环境 */
  public contextTop: CanvasRenderingContext2D;
  /** 下层画布环境 */
  public contextContainer: CanvasRenderingContext2D;

  public viewportTransform: number[] = [1, 0, 0, 1, 0, 0];

  constructor(el: HTMLCanvasElement, options = {}) {
    super();
    // 初始化下层画布 lower-canvas
    this._initStatic(el, options);
    // 初始化上层画布 upper-canvas
    this._initInteractive();
    // 处理模糊问题
    this._initRetinaScaling();
  }
  /** 初始化 _objects、lower-canvas 宽高、options 赋值 */
  _initStatic(el: HTMLCanvasElement, options) {
    this._createLowerCanvas(el);
    this._initOptions(options);
  }
  _initOptions(options) {
    for (let prop in options) {
      this[prop] = options[prop];
    }

    this.width = this.width || +this.lowerCanvasEl.width || 0;
    this.height = this.height || +this.lowerCanvasEl.height || 0;

    this.lowerCanvasEl.style.width = this.width + "px";
    this.lowerCanvasEl.style.height = this.height + "px";
  }
  _initRetinaScaling() {
    const dpr = window.devicePixelRatio;
    this.__initRetinaScaling(this.lowerCanvasEl, this.contextContainer, dpr);
    // this.__initRetinaScaling(this.upperCanvasEl, this.contextTop, dpr);
    // this.__initRetinaScaling(this.cacheCanvasEl, this.contextCache, dpr);
  }
  __initRetinaScaling(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    dpr: number
  ) {
    debugger;
    const { width, height } = this;
    // 重新设置 canvas 自身宽高大小和 css 大小。放大 canvas；css 保持不变，因为我们需要那么多的点
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    // 直接用 scale 放大整个坐标系，相对来说就是放大了每个绘制操作
    ctx.scale(dpr, dpr);
  }
  /** 初始化交互层，也就是 upper-canvas */
  _initInteractive() {}

  _createLowerCanvas(el: HTMLCanvasElement) {
    this.lowerCanvasEl = el;
    Util.addClass(this.lowerCanvasEl, "lower-canvas");
    this._applyCanvasStyle(this.lowerCanvasEl);
    this.contextContainer = this.lowerCanvasEl.getContext("2d");
  }
  _applyCanvasStyle(el: HTMLCanvasElement) {
    let width = this.width || el.width;
    let height = this.height || el.height;
    Util.setStyle(el, {
      position: "absolute",
      width: width + "px",
      height: height + "px",
      left: 0,
      top: 0,
    });
    el.width = width;
    el.height = height;
    Util.makeElementUnselectable(el);
  }

  resize(nextWidth: number, nextHeight: number) {
    this.setWidth(nextWidth).setHeight(nextHeight);
    // this.renderAll();
    const diffWidth = nextWidth / 2 - this.width / 2;
    const diffHeight = nextHeight / 2 - this.height / 2;

    this.width = nextWidth;
    this.height = nextHeight;

    const deltaPoint = new Point(diffWidth, diffHeight);
    this.relativePan(deltaPoint);
  }

  /**
   * Helper for setting width/height
   * @private
   * @param {String} prop property (width|height)
   * @param {Number} value value to set property to
   * @return {fabric.Canvas} instance
   * @chainable true
   */
  _setBackstoreDimension(prop, value) {
    this.lowerCanvasEl[prop] = value;

    if (this.upperCanvasEl) {
      this.upperCanvasEl[prop] = value;
    }

    // if (this.cacheCanvasEl) {
    //   this.cacheCanvasEl[prop] = value;
    // }

    this[prop] = value;

    return this;
  }

  /**
   * Sets width of this canvas instance
   * @param {Number|String} value                         Value to set width to
   * @param {Object}        [options]                     Options object
   * @param {Boolean}       [options.backstoreOnly=false] Set the given dimensions only as canvas backstore dimensions
   * @param {Boolean}       [options.cssOnly=false]       Set the given dimensions only as css dimensions
   * @return {fabric.Canvas} instance
   * @chainable true
   */
  setWidth(value: number, options = {}) {
    return this.setDimensions({ width: value }, options);
  }

  /**
   * Sets height of this canvas instance
   * @param {Number|String} value                         Value to set height to
   * @param {Object}        [options]                     Options object
   * @param {Boolean}       [options.backstoreOnly=false] Set the given dimensions only as canvas backstore dimensions
   * @param {Boolean}       [options.cssOnly=false]       Set the given dimensions only as css dimensions
   * @return {fabric.Canvas} instance
   * @chainable true
   */
  setHeight(value: number, options = {}) {
    return this.setDimensions({ height: value }, options);
  }

  /**
   * Sets dimensions (width, height) of this canvas instance. when options.cssOnly flag active you should also supply the unit of measure (px/%/em)
   * @param {Object}        dimensions                    Object with width/height properties
   * @param {Number|String} [dimensions.width]            Width of canvas element
   * @param {Number|String} [dimensions.height]           Height of canvas element
   * @param {Object}        [options]                     Options object
   * @param {Boolean}       [options.backstoreOnly=false] Set the given dimensions only as canvas backstore dimensions
   * @param {Boolean}       [options.cssOnly=false]       Set the given dimensions only as css dimensions
   * @return {fabric.Canvas} thisArg
   * @chainable
   */
  setDimensions(dimensions, options) {
    var cssValue;

    options = options || {};

    for (var prop in dimensions) {
      cssValue = dimensions[prop];

      if (!options.cssOnly) {
        this._setBackstoreDimension(prop, dimensions[prop]);
        cssValue += "px";
        // this.hasLostContext = true;
      }

      if (!options.backstoreOnly) {
        this._setCssDimension(prop, cssValue);
      }
    }
    this._initRetinaScaling();
    // this.calcOffset();
    // this.requestRenderAll();

    return this;
  }

  /**
   * Helper for setting css width/height
   * @private
   * @param {String} prop property (width|height)
   * @param {String} value value to set property to
   * @return {fabric.Canvas} instance
   * @chainable true
   */
  _setCssDimension(prop, value) {
    this.lowerCanvasEl.style[prop] = value;

    if (this.upperCanvasEl) {
      this.upperCanvasEl.style[prop] = value;
    }

    if (this.wrapperEl) {
      this.wrapperEl.style[prop] = value;
    }

    return this;
  }

  /**
   * Sets viewport transformation of this canvas instance
   * @param {Array} vpt a Canvas 2D API transform matrix
   * @return {fabric.Canvas} instance
   * @chainable true
   */
  setViewportTransform(vpt) {
    // var activeObject = this._activeObject,
    //     backgroundObject = this.backgroundImage,
    //     overlayObject = this.overlayImage,
    //     object, i, len;
    this.viewportTransform = vpt;
    // for (i = 0, len = this._objects.length; i < len; i++) {
    //   object = this._objects[i];
    //   object.group || object.setCoords(true);
    // }
    // if (activeObject) {
    //   activeObject.setCoords();
    // }
    // if (backgroundObject) {
    //   backgroundObject.setCoords(true);
    // }
    // if (overlayObject) {
    //   overlayObject.setCoords(true);
    // }
    // this.calcViewportBoundaries();
    // this.renderOnAddRemove && this.requestRenderAll();
    return this;
  }

  /**
   * Pan viewport so as to place point at top left corner of canvas
   * @param {Point} point to move to
   * @return {fabric.Canvas} instance
   * @chainable true
   */
  absolutePan(point) {
    var vpt = this.viewportTransform.slice(0);
    vpt[4] = -point.x;
    vpt[5] = -point.y;
    return this.setViewportTransform(vpt);
  }

  /**
   * Pans viewpoint relatively
   * @param {Point} point (position vector) to move by
   * @return {fabric.Canvas} instance
   * @chainable true
   */
  relativePan(point) {
    return this.absolutePan(
      new Point(
        -point.x - this.viewportTransform[4],
        -point.y - this.viewportTransform[5]
      )
    );
  }
}
