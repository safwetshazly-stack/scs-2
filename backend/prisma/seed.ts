import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin user
  const adminPass = await bcrypt.hash('Admin@123456', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@scsplatform.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@scsplatform.com',
      passwordHash: adminPass,
      role: 'ADMIN',
      emailVerified: true,
      profile: { create: { bio: 'SCS Platform Administrator' } },
      settings: { create: {} },
      notificationSettings: { create: {} },
      aiUsage: { create: { resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
    },
  })

  // Demo instructor
  const instrPass = await bcrypt.hash('Demo@123456', 12)
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@scsplatform.com' },
    update: {},
    create: {
      username: 'ahmed_instructor',
      email: 'instructor@scsplatform.com',
      passwordHash: instrPass,
      role: 'INSTRUCTOR',
      emailVerified: true,
      profile: { create: { bio: 'Senior Full-Stack Developer | 5+ Years Experience', country: 'EG', university: 'Cairo University', major: 'Computer Science', skills: ['React', 'Node.js', 'Python', 'AI'] } },
      settings: { create: {} },
      notificationSettings: { create: {} },
      aiUsage: { create: { resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
    },
  })

  // Subscription plans
  await prisma.subscriptionPlan.upsert({
    where: { slug: 'free' },
    update: {},
    create: { name: 'Free', slug: 'free', price: 0, aiTokensLimit: 50000, features: ['50,000 AI tokens/month', 'Join communities', 'Free courses', 'Basic chat'] },
  })
  await prisma.subscriptionPlan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: { name: 'Pro', slug: 'pro', price: 9.99, aiTokensLimit: 500000, features: ['500,000 AI tokens/month', 'All features', 'Priority support', 'Advanced AI models', 'File analysis', 'Unlimited downloads'] },
  })
  await prisma.subscriptionPlan.upsert({
    where: { slug: 'team' },
    update: {},
    create: { name: 'Team', slug: 'team', price: 29.99, aiTokensLimit: 2000000, features: ['2M AI tokens/month', 'Everything in Pro', 'Team management', 'Custom AI assistant', 'Analytics dashboard'] },
  })

  // Demo community
  const community = await prisma.community.upsert({
    where: { slug: 'programming-arabic' },
    update: {},
    create: {
      name: 'البرمجة بالعربي',
      slug: 'programming-arabic',
      description: 'مجتمع عربي للمطورين والمبرمجين. تعلم، شارك، وتطور مع أفضل المبرمجين العرب.',
      ownerId: admin.id,
      membersCount: 1,
      members: { create: { userId: admin.id, role: 'OWNER' } },
      channels: {
        createMany: {
          data: [
            { name: 'عام', type: 'TEXT', position: 0 },
            { name: 'إعلانات', type: 'ANNOUNCEMENTS', position: 1 },
            { name: 'أسئلة وأجوبة', type: 'TEXT', position: 2 },
            { name: 'مشاريع', type: 'TEXT', position: 3 },
            { name: 'ملفات', type: 'FILES', position: 4 },
          ],
        },
      },
    },
  })

  // Demo course
  await prisma.course.upsert({
    where: { slug: 'react-complete-guide' },
    update: {},
    create: {
      title: 'تطوير تطبيقات React من الصفر إلى الاحتراف',
      slug: 'react-complete-guide',
      description: 'كورس شامل لتعلم React.js من الأساسيات حتى المواضيع المتقدمة. ستتعلم Hooks, Context, Redux, Next.js وأكثر.',
      price: 0,
      level: 'BEGINNER',
      language: 'AR',
      status: 'PUBLISHED',
      tags: ['React', 'JavaScript', 'Frontend', 'Web Development'],
      instructorId: instructor.id,
      studentsCount: 0,
      rating: 4.9,
      modules: {
        create: [
          {
            title: 'مقدمة إلى React',
            position: 0,
            lessons: {
              createMany: {
                data: [
                  { title: 'ما هو React؟', duration: 600, isFree: true, position: 0 },
                  { title: 'تثبيت البيئة', duration: 900, isFree: true, position: 1 },
                  { title: 'أول مكوّن React', duration: 1200, isFree: false, position: 2 },
                ],
              },
            },
          },
          {
            title: 'React Hooks',
            position: 1,
            lessons: {
              createMany: {
                data: [
                  { title: 'useState Hook', duration: 1500, isFree: false, position: 0 },
                  { title: 'useEffect Hook', duration: 1800, isFree: false, position: 1 },
                  { title: 'useContext Hook', duration: 1200, isFree: false, position: 2 },
                ],
              },
            },
          },
        ],
      },
    },
  })

  // System settings
  await prisma.systemSetting.upsert({ where: { key: 'platform_name' }, update: {}, create: { key: 'platform_name', value: 'SCS Platform' } })
  await prisma.systemSetting.upsert({ where: { key: 'maintenance_mode' }, update: {}, create: { key: 'maintenance_mode', value: 'false' } })
  await prisma.systemSetting.upsert({ where: { key: 'ai_enabled' }, update: {}, create: { key: 'ai_enabled', value: 'true' } })

  // Feature flags
  await prisma.featureFlag.upsert({ where: { name: 'ai_image_generation' }, update: {}, create: { name: 'ai_image_generation', enabled: false } })
  await prisma.featureFlag.upsert({ where: { name: 'marketplace_services' }, update: {}, create: { name: 'marketplace_services', enabled: false } })

  console.log('✅ Seed completed!')
  console.log('👤 Admin: admin@scsplatform.com / Admin@123456')
  console.log('👨‍🏫 Instructor: instructor@scsplatform.com / Demo@123456')
}

main().catch(console.error).finally(() => prisma.$disconnect())
