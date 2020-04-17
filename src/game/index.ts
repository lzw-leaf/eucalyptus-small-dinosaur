import Stage from './stage'
import { getTimeStamp } from '@/utils'
import Trex from './sprite/Trex'
import { GameStatus } from './types'

import { eventBus } from '@/utils/eventBus'
import DistanceMeter from './stage/DistanceMeter'
export default class Game {
  // 游戏基本设置
  static config = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 300,
    PLAYER_COUNT: 1,
    INIT_SPEED: 6,
    LIMIT_SPEED: 30
  }
  // 全局传递速度
  static currentSpeed = Game.config.INIT_SPEED

  stage: Stage // 游戏舞台
  distanceMeter: DistanceMeter //仪表盘
  tRex: Trex // 恐龙

  // 游戏消耗时长
  consumeTime = 0
  // 游戏状态
  status: GameStatus = 'WAITING'

  // 动画请求Id
  reqFrameId = 0

  constructor(
    public canvasCtx: CanvasRenderingContext2D,
    options: Partial<typeof Game.config>
  ) {
    Game.config = { ...Game.config, ...options }
    this.stage = new Stage(this.canvasCtx)
    this.tRex = new Trex(this.canvasCtx)
    this.distanceMeter = new DistanceMeter(this.canvasCtx)
    this.init()
  }
  init() {
    this.setSpeed(Game.config.INIT_SPEED)
    this.startListening()
    this.scheduleNextUpdate()
  }
  update() {
    const now = getTimeStamp()
    const deltaTime = now - (this.consumeTime || now)
    this.consumeTime = now
    this.clearCanvas()

    if (this.status === 'WAITING') {
      this.stage.ground.init()
    }

    if (this.status === 'BOOTING') {
      if (this.tRex.status === 'RUNNING') {
        this.stage.ground.gameBoot()
        if (this.stage.ground.animationWidth >= Game.config.CANVAS_WIDTH) {
          this.stage.init()
          this.distanceMeter.init()
          this.status = 'PLAYING'
          eventBus.$emit('resize') //告诉vue触发resize
        }
      } else {
        this.stage.ground.init()
      }
    }

    if (this.status === 'PLAYING') {
      this.stage.update(deltaTime, Game.currentSpeed)
      this.distanceMeter.update(deltaTime)

      // 加速度
      let increaseSpeed = 2 * Math.floor(this.consumeTime / 10000)
      increaseSpeed > 24 && (increaseSpeed = 24)
      Game.currentSpeed = Game.config.INIT_SPEED + increaseSpeed
    }
    this.tRex.update(deltaTime)
    this.scheduleNextUpdate()
  }

  // 安排下一次更新
  scheduleNextUpdate() {
    this.reqFrameId = requestAnimationFrame(this.update.bind(this))
  }

  clearCanvas() {
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = Game.config
    this.canvasCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  setSpeed(speed: number) {
    speed && (Game.currentSpeed = speed)
  }

  onClick() {
    console.log('点击事件')
  }

  onkeydown(e: KeyboardEvent) {
    if ([87, 38, 32].includes(e.keyCode)) {
      this.status === 'WAITING' && (this.status = 'BOOTING') && this.scheduleNextUpdate()
      this.tRex.status !== 'JUMPING' && this.tRex.startJump()
    }
    if ([83, 40].includes(e.keyCode)) {
      if (this.tRex.status === 'JUMPING') this.tRex.speedDrop = true
      else if (['RUNNING', 'DUCKING'].includes(this.tRex.status)) this.tRex.startDuck()
    }
  }

  onkeyup(e: KeyboardEvent) {
    if ([83, 40].includes(e.keyCode)) {
      if (this.tRex.status === 'JUMPING') this.tRex.speedDrop = false
      else if (['RUNNING', 'DUCKING'].includes(this.tRex.status)) this.tRex.endDuck()
    }
  }
  startListening() {
    console.log('设置游戏监听')
    document.onclick = () => this.onClick()
    document.onkeydown = e => this.onkeydown(e)
    document.onkeyup = e => this.onkeyup(e)
  }
}
