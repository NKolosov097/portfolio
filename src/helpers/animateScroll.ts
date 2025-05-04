interface IAnimateScrollProps {
  targetPosition: number
  initialPosition: number
  duration: number
  paddingFromTop?: number
}

const pow = Math.pow

// The easing function that makes the scroll decelerate over time
function easeOutQuart(x: number) {
  return 1 - pow(1 - x, 4)
}

export function animateScroll({
  targetPosition,
  initialPosition,
  duration,
  paddingFromTop = 0,
}: IAnimateScrollProps) {
  let start: number
  let position
  let animationFrame: number

  const requestAnimationFrame = window.requestAnimationFrame
  const cancelAnimationFrame = window.cancelAnimationFrame

  // maximum amount of pixels we can scroll
  const maxAvailableScroll =
    document.documentElement.scrollHeight - document.documentElement.clientHeight

  const amountOfPixelsToScroll = initialPosition - targetPosition + paddingFromTop

  function step(timestamp: number) {
    if (start === undefined) {
      start = timestamp
    }

    const elapsed = timestamp - start

    // this just gives us a number between 0 (start) and 1 (end)
    const relativeProgress = elapsed / duration

    // ease out that number
    const easedProgress = easeOutQuart(relativeProgress)

    // calculate new position for every thick of the requestAnimationFrame
    position = initialPosition - amountOfPixelsToScroll * Math.min(easedProgress, 1)

    // set the scrollbar position
    window.scrollTo(0, position)

    // Stop when max scroll is reached
    if (initialPosition !== maxAvailableScroll && window.scrollY === maxAvailableScroll) {
      cancelAnimationFrame(animationFrame)
      return
    }

    // repeat until the end is reached
    if (elapsed < duration) {
      animationFrame = requestAnimationFrame(step)
    }
  }

  animationFrame = requestAnimationFrame(step)
}
