import { Card, CardContent } from "@/components/ui/card"
import { Users, Shield, UserCheck, UserX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from '@/lib/utils'
import { type User } from "@/lib/api"

interface StatCardsProps {
  users: User[]
}

export function StatCards({ users }: StatCardsProps) {
  const totalUsers = users.length
  const superAdmins = users.filter(u => u.role === 'SUPER_ADMIN').length
  const admins = users.filter(u => u.role === 'ADMIN').length
  const activeUsers = users.filter(u => u.isActive).length
  const inactiveUsers = users.filter(u => !u.isActive).length

  const metrics = [
    {
      title: 'Totale Utenti',
      value: totalUsers,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      title: 'Super Admin',
      value: superAdmins,
      icon: Shield,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
    {
      title: 'Admin',
      value: admins,
      icon: Shield,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    },
    {
      title: 'Utenti Attivi',
      value: activeUsers,
      icon: UserCheck,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index} className='border'>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div className={cn('p-2 rounded-lg', metric.bgColor)}>
                <metric.icon className={cn('size-5', metric.color)} />
              </div>
            </div>

            <div className='space-y-1'>
              <p className='text-muted-foreground text-sm font-medium'>{metric.title}</p>
              <div className='text-2xl font-bold'>{metric.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
