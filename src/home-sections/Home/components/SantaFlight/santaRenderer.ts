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

export interface SantaRenderer {
  setRunning: (running: boolean) => void
  seek: (seconds: number | null) => void
  dispose: VoidFunction
}

/** Own the single decorative WebGL scene and suspend all frame work when it cannot be seen. */
export function createSantaRenderer(container: HTMLDivElement): SantaRenderer {
  const deer = getNaturalDeer()
  const santa = getNaturalSanta()
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  let partialTeam: ReturnType<typeof createSantaTeam> | null = null
  let partialTrail: ReturnType<typeof createSantaMagicTrail> | null = null
  let partialEnvironment: WebGLRenderTarget | null = null
  let partialRoom: RoomEnvironment | null = null
  let partialPmrem: PMREMGenerator | null = null
  let partialObserver: ResizeObserver | null = null
  try {
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.22
    renderer.domElement.setAttribute('aria-hidden', 'true')
    container.append(renderer.domElement)

    const scene = new Scene()
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

    let disposed = false
    let lost = false
    let running = false
    let elapsed = 0
    let lastTimestamp: number | null = null
    let previewTime: number | null = null
    let frame: number | null = null
    let wake: number | null = null
    let restStarted: number | null = null
    let width = 1
    let height = 1
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
      if (frame !== null) cancelAnimationFrame(frame)
      if (wake !== null) window.clearTimeout(wake)
      if (restStarted !== null) elapsed += (performance.now() - restStarted) / 1000
      frame = null
      wake = null
      restStarted = null
      lastTimestamp = null
    }

    /** Project normalized screen positions at their actual camera depth rather than scaling a sprite. */
    function draw(seconds: number): void {
      const still = seconds === -1
      const pose = sampleSantaFlight(seconds)
      pivot.visible = still || pose.visible
      const phase = still ? 'model' : pose.phase
      if (container.dataset.phase !== phase) container.dataset.phase = phase
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
        const delay = (phase === 'rest' ? SANTA_CYCLE_SECONDS : 14) - cycle
        restStarted = performance.now()
        wake = window.setTimeout(
          () => {
            wake = null
            if (restStarted !== null) elapsed += (performance.now() - restStarted) / 1000
            restStarted = null
            lastTimestamp = null
            schedule()
          },
          delay * 1000 + 1,
        )
      } else {
        frame = requestAnimationFrame(tick)
      }
    }

    /** Advance only active time; resetting the timestamp prevents jumps after a suspended tab. */
    function tick(timestamp: number): void {
      frame = null
      if (disposed || lost || !running || previewTime !== null) return
      if (lastTimestamp !== null) elapsed += (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp
      draw(elapsed)
      schedule()
    }

    /** Refit the same camera and cap drawing resolution on narrow or high-DPI displays. */
    function resize(): void {
      if (disposed || lost) return
      const nextWidth = Math.max(1, container.clientWidth)
      const nextHeight = Math.max(1, container.clientHeight)
      if (nextWidth !== width || nextHeight !== height)
        routes = createSantaRoutes(nextWidth, nextHeight)
      width = nextWidth
      height = nextHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width <= 600 ? 1 : 1.5))
      renderer.setSize(width, height)
      draw(previewTime ?? elapsed)
    }

    /** Leave page navigation and controls working if the browser revokes the GPU context. */
    function contextLost(event: Event): void {
      event.preventDefault()
      lost = true
      stop()
      container.dataset.status = 'unavailable'
      renderer.domElement.style.visibility = 'hidden'
    }

    renderer.domElement.addEventListener('webglcontextlost', contextLost)
    const observer = new ResizeObserver(resize)
    partialObserver = observer
    observer.observe(container)
    resize()
    container.dataset.status = 'ready'

    return {
      /** Resume or suspend the existing timeline without allocating another renderer. */
      setRunning(value) {
        if (disposed || lost || running === value) return
        stop()
        running = value
        container.dataset.running = String(value)
        if (value) schedule()
      },
      /** Seek the actual model or route; null resumes the retained live timeline. */
      seek(seconds) {
        if (disposed || lost) return
        stop()
        previewTime = seconds !== null && Number.isFinite(seconds) ? seconds : null
        draw(previewTime ?? elapsed)
        schedule()
      },
      /** Release each listener, model resource, reflection texture and GPU context exactly once. */
      dispose() {
        if (disposed) return
        disposed = true
        stop()
        observer.disconnect()
        renderer.domElement.removeEventListener('webglcontextlost', contextLost)
        team.dispose()
        trail.dispose()
        environment.dispose()
        scene.environment = null
        scene.clear()
        renderer.dispose()
        renderer.forceContextLoss()
        renderer.domElement.remove()
      },
    }
  } catch (error) {
    partialObserver?.disconnect()
    partialRoom?.dispose()
    partialPmrem?.dispose()
    partialTeam?.dispose()
    partialTrail?.dispose()
    partialEnvironment?.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
    throw error
  }
}
