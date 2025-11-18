'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';
import { OverviewStats } from '@/types';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<OverviewStats>({
    queryKey: ['overview-stats'],
    queryFn: () => apiClient.getOverview(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      subtitle: `${stats?.users.active || 0} active`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Courses',
      value: stats?.courses.total || 0,
      subtitle: `${stats?.courses.published || 0} published`,
      icon: BookOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Enrollments',
      value: stats?.enrollments.total || 0,
      subtitle: `${stats?.enrollments.completed || 0} completed`,
      icon: GraduationCap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Completion Rate',
      value: `${stats?.enrollments.completionRate.toFixed(1) || 0}%`,
      subtitle: 'Overall performance',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to your Enterprise Performance Engine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/dashboard/ai-studio"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-primary">AI Content Studio</h3>
              <p className="text-sm text-gray-500">Generate lessons from documents using AI</p>
            </a>
            <a
              href="/dashboard/courses"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold">Manage Courses</h3>
              <p className="text-sm text-gray-500">Create and organize your learning content</p>
            </a>
            <a
              href="/dashboard/analytics"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold">View Analytics</h3>
              <p className="text-sm text-gray-500">Track learning progress and engagement</p>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 text-center py-8">
              Activity feed coming soon...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
