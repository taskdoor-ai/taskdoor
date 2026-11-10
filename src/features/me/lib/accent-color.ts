const channels = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16))

const luminance = (rgb: number[]) => rgb.reduce((sum, channel, index) => {
  const value = channel / 255
  return sum + (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index]
}, 0)

/** Retain the selected hue, adjusting only as far as needed for readable inline text. */
export function getAccentTextColor(accent: string, background: string) {
  const rgb = channels(accent)
  const surface = luminance(channels(background))
  const target = surface > 0.5 ? 0 : 255
  for (let step = 0; step <= 100; step += 1) {
    const adjusted = rgb.map((channel) => Math.round(channel + (target - channel) * step / 100))
    const ink = luminance(adjusted)
    if ((Math.max(ink, surface) + 0.05) / (Math.min(ink, surface) + 0.05) >= 4.5) {
      return `#${adjusted.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
    }
  }
  return target === 0 ? '#000000' : '#ffffff'
}
