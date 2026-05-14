export function wait(duration = 0) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration)
  })
}

export async function withMinimumDelay(promise, duration = 220) {
  const [result] = await Promise.all([promise, wait(duration)])
  return result
}
