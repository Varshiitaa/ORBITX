/** Editorial context for the explorer. These sentences are not Horizons products. */
export const PLANET_COPY: Record<string, string> = {
  sun: 'The star at the center of this view. In the heliocentric frame used here, it is the coordinate origin.',
  mercury: 'The innermost planet, on a short and noticeably eccentric orbit.',
  venus: 'Similar to Earth in size, wrapped in a dense cloudy atmosphere.',
  earth: 'Our reference planet. The Moon is listed separately because Horizons gives it its own state vector.',
  moon: 'Earth’s natural satellite. At solar-system scale its heliocentric position sits very near Earth.',
  mars: 'The outer neighbor of Earth, and the most common destination in the mission planner.',
  jupiter: 'The largest planet. Its heliocentric distance is several times Earth’s.',
  saturn: 'A gas giant recognized by its broad ring system. The rings in the view are a visual model.',
  uranus: 'An ice giant whose orbital plane is slightly inclined to the ecliptic.',
  neptune: 'The outermost planet in this catalog, far enough that its range has to be compressed to share the view with Mercury.',
}

export const BODY_ORDER = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const
