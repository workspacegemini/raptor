'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  GraduationCap,
  Search,
  Edit,
  Trash2,
  FileText,
  Video,
  CheckCircle,
  Clock,
  BookOpen,
  PlayCircle,
} from 'lucide-react';
import { Lesson, LessonType, Course } from '@/types';
import { formatDate } from '@/lib/utils';

export default function LessonsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch courses for filtering
  const { data: courses } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await apiClient.getCourses();
      return response.data || response;
    },
  });

  // Fetch lessons
  const { data: lessons, isLoading } = useQuery<Lesson[]>({
    queryKey: ['lessons', courseFilter],
    queryFn: async () => {
      if (courseFilter === 'all') {
        // Fetch lessons for all courses
        const allLessons: Lesson[] = [];
        for (const course of courses || []) {
          const response = await apiClient.getLessons(course.id);
          allLessons.push(...(response.data || response || []));
        }
        return allLessons;
      } else {
        const response = await apiClient.getLessons(courseFilter);
        return response.data || response;
      }
    },
    enabled: courseFilter !== 'all' || (courses && courses.length > 0),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteLesson(id),
    onSuccess: () => {
      toast.success('Lesson deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete lesson');
    },
  });

  const filteredLessons = lessons?.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || lesson.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: LessonType) => {
    const config: Record<
      LessonType,
      { icon: any; color: string; label: string }
    > = {
      TEXT: { icon: FileText, color: 'bg-blue-100 text-blue-800', label: 'Text' },
      VIDEO: { icon: Video, color: 'bg-purple-100 text-purple-800', label: 'Video' },
      INTERACTIVE: { icon: PlayCircle, color: 'bg-green-100 text-green-800', label: 'Interactive' },
      QUIZ: { icon: CheckCircle, color: 'bg-orange-100 text-orange-800', label: 'Quiz' },
      ASSESSMENT: { icon: GraduationCap, color: 'bg-red-100 text-red-800', label: 'Assessment' },
    };

    const { icon: Icon, color, label } = config[type];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete lesson "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Get course name helper
  const getCourseName = (courseId: string) => {
    return courses?.find((c) => c.id === courseId)?.title || 'Unknown Course';
  };

  // Type statistics
  const typeStats = lessons?.reduce((acc, lesson) => {
    acc[lesson.type] = (acc[lesson.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalDuration = lessons?.reduce((sum, lesson) => sum + (lesson.duration || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lessons</h1>
          <p className="text-gray-500 mt-1">Manage learning content and microlessons</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Lesson
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <GraduationCap className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lessons?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Across {courses?.length || 0} courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Video Lessons</CardTitle>
            <Video className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeStats?.VIDEO || 0}</div>
            <p className="text-xs text-gray-500 mt-1">With video content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(typeStats?.QUIZ || 0) + (typeStats?.ASSESSMENT || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Quizzes & assessments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
            <p className="text-xs text-gray-500 mt-1">Learning time</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search lessons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Courses</option>
                {courses?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-40">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="TEXT">Text</option>
                <option value="VIDEO">Video</option>
                <option value="INTERACTIVE">Interactive</option>
                <option value="QUIZ">Quiz</option>
                <option value="ASSESSMENT">Assessment</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : !filteredLessons || filteredLessons.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No lessons found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || typeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first lesson'}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Lesson
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map((lesson) => (
            <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(lesson.type)}
                      <Badge variant="outline">Order {lesson.order}</Badge>
                    </div>
                    <CardTitle className="text-lg mb-2">{lesson.title}</CardTitle>
                    <p className="text-sm text-gray-500 line-clamp-2">{lesson.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <BookOpen className="h-4 w-4" />
                    <span className="font-medium">{getCourseName(lesson.courseId)}</span>
                  </div>
                </div>

                {lesson.duration && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(lesson.duration)}</span>
                  </div>
                )}

                {lesson.videoId && (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <Video className="h-4 w-4" />
                    <span>Video: {lesson.videoId}</span>
                  </div>
                )}

                <div className="text-xs text-gray-500">Created {formatDate(lesson.createdAt)}</div>

                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(lesson.id, lesson.title)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lesson count */}
      {filteredLessons && filteredLessons.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
