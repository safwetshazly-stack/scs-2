import { prisma, redis } from '../server'

export const searchService = {
  // Global search across courses, communities, users, books
  globalSearch: async (query: string, userId?: string) => {
    if (!query || query.trim().length < 2) return { courses: [], communities: [], users: [], books: [] }

    const q = query.trim()
    const cacheKey = `search:${q.toLowerCase()}`
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const [courses, communities, users, books] = await Promise.all([
      prisma.course.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { tags: { has: q } },
          ],
        },
        take: 5,
        select: { id: true, title: true, slug: true, thumbnail: true, price: true, rating: true, instructor: { select: { username: true } } },
      }),

      prisma.community.findMany({
        where: {
          isPrivate: false,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, slug: true, avatar: true, membersCount: true },
      }),

      prisma.user.findMany({
        where: {
          isBanned: false,
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { profile: { bio: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        select: { id: true, username: true, role: true, profile: { select: { avatar: true, bio: true } } },
      }),

      prisma.book.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, title: true, slug: true, coverImage: true, price: true, author: { select: { username: true } } },
      }),
    ])

    // Save search history
    if (userId) {
      prisma.searchHistory.create({ data: { userId, query: q } }).catch(() => {})
    }

    const result = { courses, communities, users, books, query: q }
    await redis.setEx(cacheKey, 120, JSON.stringify(result))
    return result
  },

  // Get search suggestions (autocomplete)
  getSuggestions: async (query: string): Promise<string[]> => {
    if (query.length < 2) return []

    const [courses, communities] = await Promise.all([
      prisma.course.findMany({
        where: { status: 'PUBLISHED', title: { startsWith: query, mode: 'insensitive' } },
        take: 5,
        select: { title: true },
      }),
      prisma.community.findMany({
        where: { name: { startsWith: query, mode: 'insensitive' } },
        take: 3,
        select: { name: true },
      }),
    ])

    const suggestions = [
      ...courses.map(c => c.title),
      ...communities.map(c => c.name),
    ]

    return [...new Set(suggestions)].slice(0, 8)
  },
}
