import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
  type WebGLRenderTarget,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import { getNaturalDeer, prepareNaturalDeer } from './naturalDeerAsset'
import { getNaturalSanta, prepareNaturalSanta } from './naturalSantaAsset'
import { createSantaTeam, type SantaFormation } from './santaModel'
import { createSantaMagicTrail } from './santaMagicTrail'
import { createSantaQuality } from './santaQuality'
import type { SantaScene, SantaSceneOptions } from './santaWorkerProtocol'
import {
  createSantaRoutes,
  sampleSantaFlight,
  sampleSantaTimedFormation,
  SANTA_CAMERA_DISTANCE,
  SANTA_CAMERA_FOV,
  SANTA_CYCLE_SECONDS,
} from './santaTrajectory'

/** Decode both optional CPU templates before any renderer context can be allocated. */
export async function prepareSantaAssets(): Promise<void> {
  await Promise.all([prepareNaturalDeer(), prepareNaturalSanta()])
}

/** Build the same scene on either canvas backend, warming shaders before any presentation. */
export async function createSantaScene(options: SantaSceneOptions): Promise<SantaScene> {
  const { canvas, scheduler, onState, signal } = options
  if (signal.aborted) throw new Error('Santa scene initialization cancelled')
  const deer = getNaturalDeer()
  const santa = getNaturalSanta()
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  })
  let partialTeam: ReturnType<typeof createSantaTeam> | null = null
  let partialTrail: ReturnType<typeof createSantaMagicTrail> | null = null
  let partialEnvironment: WebGLRenderTarget | null = null
  let partialRoom: RoomEnvironment | null = null
  let partialPmrem: PMREMGenerator | null = null
  let partialContextLost: ((event: Event) => void) | null = null
  let partialScene: Scene | null = null
  let stopScheduling: VoidFunction | null = null
  let disposed = false
  let rejectInitialization: ((error: Error) => void) | null = null

  /** Release partial or complete ownership once, including while shader readiness is unresolved. */
  function dispose(): void {
    if (disposed) return
    disposed = true
    stopScheduling?.()
    signal.removeEventListener('abort', cancelInitialization)
    if (partialContextLost)
      renderer.domElement.removeEventListener('webglcontextlost', partialContextLost)
    partialRoom?.dispose()
    partialPmrem?.dispose()
    partialTeam?.dispose()
    partialTrail?.dispose()
    partialEnvironment?.dispose()
    if (partialScene) {
      partialScene.environment = null
      partialScene.clear()
    }
    renderer.dispose()
    renderer.forceContextLoss()
  }

  /** Settle initialization immediately instead of waiting for a lost GPU program to finish. */
  function cancelInitialization(): void {
    dispose()
    rejectInitialization?.(new Error('Santa scene initialization cancelled'))
  }
  try {
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.22

    const scene = new Scene()
    partialScene = scene
    const camera = new PerspectiveCamera(SANTA_CAMERA_FOV, 1, 0.1, 120)
    camera.position.z = SANTA_CAMERA_DISTANCE
    const team = createSantaTeam(deer, santa)
    partialTeam = team
    const pivot = new Group()
    pivot.add(team.group)
    scene.add(pivot)
    const trail = createSantaMagicTrail()
    partialTrail = trail
    scene.add(trail.object)
    scene.add(new HemisphereLight(0xb8dcff, 0x2d2938, 2.3))
    const key = new DirectionalLight(0xd9eaff, 3.5)
    key.position.set(-4, 9, 12)
    scene.add(key)
    const rim = new DirectionalLight(0x7caeff, 3)
    rim.position.set(4, 5, -8)
    scene.add(rim)

    const pmrem = new PMREMGenerator(renderer)
    partialPmrem = pmrem
    const room = new RoomEnvironment()
    partialRoom = room
    const environment = pmrem.fromScene(room, 0.06)
    partialEnvironment = environment
    scene.environment = environment.texture
    scene.environmentIntensity = 0.38
    room.dispose()
    partialRoom = null
    pmrem.dispose()
    partialPmrem = null

    let lost = false
    let running = false
    let elapsed = 0
    let lastTimestamp: number | null = null
    let previewTime = options.previewTime
    let frame: number | null = null
    let wake: number | null = null
    let restStarted: number | null = null
    let width = 1
    let height = 1
    let deviceRatio = options.devicePixelRatio
    let appliedRatio = 0
    let appliedWidth = 0
    let appliedHeight = 0
    let nextDraw: number | null = null
    let lastDraw: number | null = null
    let presentedPhase: string | null = null
    const quality = createSantaQuality()
    let routes = createSantaRoutes(width, height)
    const formation: SantaFormation = {
      frames: [
        { position: new Vector3(), rotation: new Quaternion() },
        { position: new Vector3(), rotation: new Quaternion() },
        { position: new Vector3(), rotation: new Quaternion() },
      ],
      scale: 1,
    }
    const size = new Vector3()
    new Box3().setFromObject(team.group).getSize(size)

    /** Cancel both scheduling paths while retaining active elapsed time for a smooth resume. */
    function stop(): void {
      if (frame !== null) scheduler.cancelFrame(frame)
      if (wake !== null) scheduler.clearTimer(wake)
      if (restStarted !== null) elapsed += (scheduler.now() - restStarted) / 1000
      frame = null
      wake = null
      restStarted = null
      lastTimestamp = null
      nextDraw = null
      lastDraw = null
      quality.reset()
    }

    stopScheduling = stop

    /** Project normalized screen positions at their actual camera depth rather than scaling a sprite. */
    function draw(seconds: number): void {
      const still = seconds === -1
      const pose = sampleSantaFlight(seconds)
      pivot.visible = still || pose.visible
      const nextPhase = still ? 'model' : pose.phase
      if (presentedPhase !== nextPhase) {
        presentedPhase = nextPhase
        onState({ phase: nextPhase })
      }
      if (still) {
        const viewHeight = 2 * SANTA_CAMERA_DISTANCE * Math.tan((camera.fov * Math.PI) / 360)
        const scale = Math.min(
          (viewHeight * camera.aspect * 0.76) / size.x,
          (viewHeight * 0.8) / size.y,
        )
        pivot.scale.setScalar(scale)
        pivot.position.set(0, -0.15, 0)
        pivot.rotation.set(0.1, -0.24, 0.025)
        team.animate(0.2)
      } else {
        const viewWidth =
          2 * SANTA_CAMERA_DISTANCE * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect
        formation.scale = (viewWidth * (width <= 600 ? 0.16 : 0.18)) / size.x
        const route = routes[pose.phase === 'near' ? 'near' : 'distant']
        sampleSantaTimedFormation(
          route,
          pose.progress,
          team.spacing * formation.scale,
          formation.frames,
        )
        pivot.scale.setScalar(1)
        pivot.position.set(0, 0, 0)
        pivot.rotation.set(0, 0, 0)
        team.animate(seconds, formation)
      }
      trail.update(
        seconds,
        routes,
        team.spacing,
        formation.scale,
        height * renderer.getPixelRatio(),
        renderer.getPixelRatio(),
      )
      renderer.render(scene, camera)
    }

    /** Sleep through hidden cycle phases with one timer instead of a background animation loop. */
    function schedule(): void {
      if (disposed || lost || !running || previewTime !== null) return
      const cycle = elapsed % SANTA_CYCLE_SECONDS
      const phase = sampleSantaFlight(elapsed).phase
      if (phase === 'rest' || phase === 'turnaround') {
        quality.reset()
        lastDraw = null
        nextDraw = null
        const delay = (phase === 'rest' ? SANTA_CYCLE_SECONDS : 14) - cycle
        restStarted = scheduler.now()
        wake = scheduler.setTimer(
          () => {
            wake = null
            if (restStarted !== null) elapsed += (scheduler.now() - restStarted) / 1000
            restStarted = null
            lastTimestamp = null
            draw(elapsed)
            lastTimestamp = scheduler.now()
            nextDraw = lastTimestamp + quality.frameInterval
            lastDraw = lastTimestamp
            schedule()
          },
          delay * 1000 + 1,
        )
      } else {
        frame = scheduler.requestFrame(tick)
      }
    }

    /** Advance the timeline on every RAF while accumulated deadlines cap only presentation. */
    function tick(timestamp: number): void {
      frame = null
      if (disposed || lost || !running || previewTime !== null) return
      if (lastTimestamp !== null) elapsed += Math.max(0, timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      const currentPhase = sampleSantaFlight(elapsed).phase
      const hidden = currentPhase === 'rest' || currentPhase === 'turnaround'
      if (hidden || nextDraw === null || timestamp + 0.01 >= nextDraw) {
        fit()
        const started = scheduler.now()
        draw(elapsed)
        const cost = scheduler.now() - started
        if (!hidden && lastDraw !== null) quality.sample(timestamp, cost, timestamp - lastDraw)
        lastDraw = timestamp
        const interval = quality.frameInterval
        nextDraw =
          nextDraw === null || timestamp - nextDraw > interval
            ? timestamp + interval
            : nextDraw + interval
      }
      schedule()
    }

    /** Change backing dimensions only when needed; route reconstruction follows CSS size alone. */
    function fit(): void {
      const ratio =
        previewTime === null
          ? quality.pixelRatio(width, deviceRatio)
          : Math.min(deviceRatio, width <= 600 ? 1 : 1.5)
      if (appliedRatio === ratio && appliedWidth === width && appliedHeight === height) return
      const dimensionsChanged = appliedWidth !== width || appliedHeight !== height
      // setPixelRatio already resizes the buffer; a tier-only change needs no second setSize.
      if (appliedRatio !== ratio) renderer.setPixelRatio(ratio)
      if (dimensionsChanged) renderer.setSize(width, height, false)
      appliedRatio = ratio
      appliedWidth = width
      appliedHeight = height
    }

    /** Refit the camera without presenting a hidden or not-yet-ready scene. */
    function resize(nextWidth: number, nextHeight: number, nextDeviceRatio: number): void {
      if (disposed || lost) return
      if (
        appliedRatio &&
        width === nextWidth &&
        height === nextHeight &&
        deviceRatio === nextDeviceRatio
      )
        return
      if (nextWidth !== width || nextHeight !== height)
        routes = createSantaRoutes(nextWidth, nextHeight)
      width = nextWidth
      height = nextHeight
      deviceRatio = nextDeviceRatio
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      quality.reset()
      lastDraw = null
      fit()
      if (running) draw(previewTime ?? elapsed)
    }

    /** Leave page navigation and controls working if the browser revokes the GPU context. */
    function contextLost(event: Event): void {
      event.preventDefault()
      lost = true
      cancelInitialization()
      onState({ status: 'unavailable', running: false })
    }

    partialContextLost = contextLost
    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    resize(options.width, options.height, options.devicePixelRatio)
    if (disposed || signal.aborted) throw new Error('Santa scene initialization cancelled')
    const cancelled = new Promise<never>((_, reject) => {
      rejectInitialization = reject
    })
    signal.addEventListener('abort', cancelInitialization, { once: true })
    // compile traverses hidden trail and morph meshes, so no throwaway frame is necessary.
    await Promise.race([renderer.compileAsync(scene, camera), cancelled])
    if (disposed || signal.aborted || lost) throw new Error('Santa scene initialization cancelled')

    return {
      /** Resume or suspend the existing timeline without allocating another renderer. */
      setRunning(value) {
        if (disposed || lost || running === value) return
        stop()
        running = value
        onState({ running: value })
        if (value) {
          fit()
          draw(previewTime ?? elapsed)
          if (previewTime === null) {
            lastTimestamp = scheduler.now()
            lastDraw = lastTimestamp
            nextDraw = lastTimestamp + quality.frameInterval
          }
          schedule()
        }
      },
      /** Seek the actual model or route; null resumes the retained live timeline. */
      seek(seconds) {
        if (disposed || lost) return
        stop()
        previewTime = seconds !== null && Number.isFinite(seconds) ? seconds : null
        fit()
        if (running) {
          draw(previewTime ?? elapsed)
          if (previewTime === null) {
            lastTimestamp = scheduler.now()
            lastDraw = lastTimestamp
            nextDraw = lastTimestamp + quality.frameInterval
          }
        }
        schedule()
      },
      resize,
      dispose,
    }
  } catch (error) {
    dispose()
    throw error
  }
}
