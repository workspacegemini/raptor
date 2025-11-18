'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Upload,
  Sparkles,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { AiGenerationJob, AiJobStatus, Course } from '@/types';
import { formatBytes, formatDateTime } from '@/lib/utils';

export default function AiStudioPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [targetLessonCount, setTargetLessonCount] = useState<number>(10);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  // Fetch courses for selection
  const { data: courses } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await apiClient.getCourses();
      return response.data || response;
    },
  });

  // Fetch AI generation jobs
  const { data: jobs, refetch: refetchJobs } = useQuery<AiGenerationJob[]>({
    queryKey: ['ai-jobs'],
    queryFn: async () => {
      const response = await apiClient.listAiJobs({ limit: 20 });
      return response.data || response;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Analyze document mutation
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const result = await apiClient.analyzeDocument(selectedFile);
      setAnalysis(result);
      setTargetLessonCount(result.estimatedLessonCount || 10);
      toast.success('Document analyzed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate lessons mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !selectedCourseId) {
        throw new Error('Please select a file and course');
      }
      return apiClient.generateLessons(selectedCourseId, selectedFile, targetLessonCount);
    },
    onSuccess: () => {
      toast.success('Lesson generation started! This may take a few minutes...');
      setSelectedFile(null);
      setAnalysis(null);
      refetchJobs();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start generation');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.md')) {
        toast.error('Please upload a PDF, TXT, or MD file');
        return;
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setAnalysis(null);
    }
  };

  const getStatusBadge = (status: AiJobStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'PROCESSING':
        return <Badge variant="warning">Processing</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getStatusIcon = (status: AiJobStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'PROCESSING':
        return <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'CANCELLED':
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI Content Studio
        </h1>
        <p className="text-gray-500 mt-1">
          Transform training documents into engaging microlearning lessons using AI
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Lessons from Document</CardTitle>
          <CardDescription>
            Upload a PDF, TXT, or MD file (max 10MB) and let AI create 5-20 bite-sized lessons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Training Document</Label>
            <div className="flex items-center gap-4">
              <input
                id="file"
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('file')?.click()}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-gray-500">({formatBytes(selectedFile.size)})</span>
                </div>
              )}
            </div>
          </div>

          {/* Analyze Button */}
          {selectedFile && !analysis && (
            <Button onClick={handleAnalyze} disabled={isAnalyzing} variant="secondary">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Document
                </>
              )}
            </Button>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
              <h4 className="font-semibold text-blue-900">Analysis Complete</h4>
              <p className="text-sm text-blue-800">{analysis.analysis}</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-blue-700">
                  Document Length: <strong>{analysis.documentLength} characters</strong>
                </span>
                <span className="text-blue-700">
                  Suggested Lessons: <strong>{analysis.estimatedLessonCount}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Course Selection */}
          {analysis && (
            <>
              <div className="space-y-2">
                <Label htmlFor="course">Target Course</Label>
                <select
                  id="course"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a course...</option>
                  {courses?.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lesson Count */}
              <div className="space-y-2">
                <Label htmlFor="lessonCount">Number of Lessons ({targetLessonCount})</Label>
                <input
                  id="lessonCount"
                  type="range"
                  min="5"
                  max="20"
                  value={targetLessonCount}
                  onChange={(e) => setTargetLessonCount(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">Adjust the number of lessons to generate</p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={!selectedCourseId || generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting Generation...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate {targetLessonCount} Lessons
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Generation Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Generation History</CardTitle>
          <CardDescription>Track your AI content generation jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {!jobs || jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No generation jobs yet. Upload a document to get started!
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {job.generatedLessonsCount}/{job.targetLessonCount} lessons
                        </span>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-gray-500">{formatDateTime(job.createdAt)}</p>
                      {job.error && <p className="text-sm text-red-600 mt-1">{job.error}</p>}
                    </div>
                  </div>
                  {job.status === 'PROCESSING' && (
                    <div className="text-sm text-gray-600">{job.progress}% complete</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
