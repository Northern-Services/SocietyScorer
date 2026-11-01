import { ok, handleError, createError } from '../utils/api'

export default defineEventHandler(async (event) => {
  const { latitude, longitude } = getQuery(event)
  const lat = parseFloat(latitude as string)
  const lon = parseFloat(longitude as string)

  if (!lat || !lon) throw createError({ statusCode: 400, statusMessage: 'Latitude and longitude are required.' })

  try {
    // Fetch 3-day forecast from Open-Meteo (free, no API key)
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&current_weather=true&timezone=auto`
    )
    if (!res.ok) throw new Error('Weather service unavailable')
    const data = await res.json()

    const current = data.current_weather || {}
    const daily = data.daily || {}
    const todayIndex = 0

    const weatherCodes: Record<string, string> = {
      '0': 'Clear sky', '1': 'Mainly clear', '2': 'Partly cloudy', '3': 'Overcast',
      '45': 'Fog', '48': 'Depositing rime fog', '51': 'Light drizzle', '53': 'Moderate drizzle',
      '55': 'Dense drizzle', '56': 'Light freezing drizzle', '57': 'Dense freezing drizzle',
      '61': 'Slight rain', '63': 'Moderate rain', '65': 'Heavy rain', '66': 'Light freezing rain',
      '67': 'Heavy freezing rain', '71': 'Slight snow fall', '73': 'Moderate snow fall',
      '75': 'Heavy snow fall', '77': 'Snow grains', '80': 'Slight rain showers',
      '81': 'Moderate rain showers', '82': 'Heavy rain showers', '85': 'Slight snow showers',
      '86': 'Heavy snow showers', '95': 'Thunderstorm', '96': 'Thunderstorm with hail'
    }

    const weatherCode = String(current.weathercode || 0)
    return ok({
      data: {
        temperature: current.temperature,
        windspeed: current.windspeed,
        winddirection: current.winddirection,
        weathercode: current.weathercode,
        description: weatherCodes[weatherCode] || 'Unknown',
        isDay: current.isDay,
        maxTemp: daily.temperature_2m_max?.[todayIndex],
        minTemp: daily.temperature_2m_min?.[todayIndex],
        precipitation: daily.precipitation_sum?.[todayIndex],
        precipProbability: daily.precipitation_probability_max?.[todayIndex],
        time: current.time
      }
    })
  } catch (e: any) { handleError(e, 'Failed to fetch weather data.') }
})
