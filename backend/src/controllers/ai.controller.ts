import { Request, Response, NextFunction } from 'express'
import { prisma } from '../server'
import { AppError } from '../utils/errors'
import { processAiRequest, streamAiRequest } from '../services/ai.service'

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversations = await prisma.aiConversation.findMany({
      where: { userId: req.user!.id, isArchived: false },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true, title: true, model: true, createdAt: true, updatedAt: true,
        _count: { select: { messages: true } },
      },
    })
    res.json(conversations)
  } catch (error) { next(error) }
}

export const createConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, model = 'AUTO' } = req.body
    const conversation = await prisma.aiConversation.create({
      data: { userId: req.user!.id, title, model },
    })
    res.status(201).json(conversation)
  } catch (error) { next(error) }
}

export const getMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!conversation) throw new AppError('Conversation not found', 404)

    const messages = await prisma.aiMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    })
    res.json(messages)
  } catch (error) { next(error) }
}

export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { message, taskType = 'chat', preferredModel = 'AUTO' } = req.body

    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!conversation) throw new AppError('Conversation not found', 404)

    const result = await processAiRequest({
      userId: req.user!.id,
      conversationId: id,
      message,
      taskType,
      preferredModel,
    })

    res.json(result)
  } catch (error) { next(error) }
}

export const streamMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { message, taskType = 'chat' } = req.body

    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!conversation) throw new AppError('Conversation not found', 404)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    await streamAiRequest(
      { userId: req.user!.id, conversationId: id, message, taskType },
      (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
    )

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    if (!res.headersSent) next(error)
    else res.end()
  }
}

export const deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId: req.user!.id },
    })
    if (!conversation) throw new AppError('Not found', 404)
    await prisma.aiConversation.delete({ where: { id } })
    res.json({ message: 'Deleted' })
  } catch (error) { next(error) }
}

export const getUsage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usage = await prisma.aiUsage.findUnique({ where: { userId: req.user!.id } })
    const subscription = await prisma.userSubscription.findFirst({
      where: { userId: req.user!.id, status: 'active' },
      include: { plan: { select: { name: true, aiTokensLimit: true } } },
    })
    res.json({
      tokensUsed: usage?.tokensUsed || 0,
      requestCount: usage?.requestCount || 0,
      limit: subscription ? subscription.plan.aiTokensLimit : 50000,
      plan: subscription?.plan.name || 'Free',
      resetAt: usage?.resetAt,
    })
  } catch (error) { next(error) }
}
