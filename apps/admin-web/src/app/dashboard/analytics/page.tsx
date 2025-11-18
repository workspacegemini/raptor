'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, BookOpen, Target, Award } from 'lucide-react';
import { OverviewStats, LearningActivity, TopCourse } from '@/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  // Fetch overview stats
  const { data: overview } = useQuery<OverviewStats>({
    queryKey: ['analytics-overview'],
    queryFn: () => apiClient.getOverview(),
  });

  // Fetch learning activity
  const { data: activity } = useQuery<LearningActivity[]>({
    queryKey: ['learning-activity'],
    queryFn: () => apiClient.getLearningActivity(30),
  });

  // Fetch top courses
  const { data: topCourses } = useQuery<TopCourse[]>({
    queryKey: ['top-courses'],
    queryFn: () => apiClient.getTopCourses(5),
  });

  // Fetch user engagement
  const { data: engagement } = useQuery<any>({
    queryKey: ['user-engagement'],
    queryFn: () => apiClient.getUserEngagement(),
  });

  // Fetch competency matrix
  const { data: competencyMatrix } = useQuery<any>({
    queryKey: ['competency-matrix'],
    queryFn: () => apiClient.getCompetencyMatrix(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Track learning progress and engagement metrics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Learners</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.users.active || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {overview?.users.total || 0} total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.courses.published || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {overview?.courses.total || 0} total courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.enrollments.completionRate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {overview?.enrollments.completed || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Award className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {engagement?.engagementRate.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Based on active users</p>
          </CardContent>
        </Card>
      </div>

      {/* Learning Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Activity (Last 30 Days)</CardTitle>
          <CardDescription>Track enrollments, progress, and completions over time</CardDescription>
        </CardHeader>
        <CardContent>
          {activity && activity.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="enrollments"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Enrollments"
                />
                <Line
                  type="monotone"
                  dataKey="progress"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Progress Updates"
                />
                <Line
                  type="monotone"
                  dataKey="completions"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Completions"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Loading activity data...
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Courses */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Courses</CardTitle>
            <CardDescription>Based on enrollment and completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            {topCourses && topCourses.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCourses} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="title"
                    type="category"
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="enrollments" fill="#3b82f6" name="Enrollments" />
                  <Bar dataKey="completions" fill="#10b981" name="Completions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No course data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competency Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Competency Distribution</CardTitle>
            <CardDescription>Skill levels across organization</CardDescription>
          </CardHeader>
          <CardContent>
            {competencyMatrix && competencyMatrix.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={competencyMatrix}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {competencyMatrix.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Loading competency data...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Engagement Details */}
      {engagement && (
        <Card>
          <CardHeader>
            <CardTitle>User Engagement Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {engagement.averageEnrollmentsPerUser.toFixed(1)}
                </div>
                <div className="text-sm text-blue-800 mt-1">Avg Enrollments per User</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {engagement.averageCompletionsPerUser.toFixed(1)}
                </div>
                <div className="text-sm text-green-800 mt-1">Avg Completions per User</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {engagement.engagementRate.toFixed(1)}%
                </div>
                <div className="text-sm text-purple-800 mt-1">Overall Engagement Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
