'use client';

import { useEffect } from 'react';
import { useWebSocket, useRealtimeNotifications } from '@/lib/websocket-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Real-time notification listener component
 * Place this at the root of your app to listen for WebSocket events
 */
export function RealtimeNotificationListener() {
  const queryClient = useQueryClient();

  // Enable real-time notifications
  useRealtimeNotifications();

  // Listen for enrollment events
  useWebSocket('enrollment:created', (data) => {
    toast.success('New Enrollment', {
      description: data.message,
    });

    // Invalidate enrollments query to refetch
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
  });

  // Listen for course completions
  useWebSocket('course:completed', (data) => {
    toast.success('🎉 Course Completed!', {
      description: data.message,
    });

    queryClient.invalidateQueries({ queryKey: ['courses'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  });

  // Listen for lesson completions
  useWebSocket('lesson:completed', (data) => {
    toast.success('✅ Lesson Completed', {
      description: data.message,
    });

    queryClient.invalidateQueries({ queryKey: ['lessons'] });
    queryClient.invalidateQueries({ queryKey: ['progress'] });
  });

  // Listen for course published events
  useWebSocket('course:published', (data) => {
    toast.info('📚 New Course Available', {
      description: data.message,
    });

    queryClient.invalidateQueries({ queryKey: ['courses'] });
  });

  // Listen for AI job status updates
  useWebSocket('ai-job:status', (data) => {
    const { status, progress, result } = data;

    if (status === 'COMPLETED') {
      toast.success('✨ AI Generation Complete', {
        description: `${result?.lessonsCreated || 0} lessons created`,
      });
    } else if (status === 'FAILED') {
      toast.error('❌ AI Generation Failed', {
        description: 'Please try again',
      });
    } else if (status === 'PROCESSING') {
      toast.loading(`AI Processing... ${progress}%`, {
        id: data.jobId,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['ai-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['lessons'] });
  });

  // Listen for skill badge earned
  useWebSocket('skill:badge-earned', (data) => {
    toast.success('🏆 Badge Earned!', {
      description: `You earned a ${data.level} badge in ${data.skillName}!`,
    });

    queryClient.invalidateQueries({ queryKey: ['skills'] });
    queryClient.invalidateQueries({ queryKey: ['user'] });
  });

  // Listen for team updates
  useWebSocket('team:updated', (data) => {
    toast.info('Team Updated', {
      description: `Changes made to ${data.teamId}`,
    });

    queryClient.invalidateQueries({ queryKey: ['teams'] });
  });

  // Listen for system announcements
  useWebSocket('system:announcement', (data) => {
    toast.info(data.title, {
      description: data.message,
      duration: 10000,
    });
  });

  // Listen for connection status
  useWebSocket('internal:connected', (data) => {
    console.log('🔌 WebSocket connected:', data.socketId);
  });

  useWebSocket('internal:disconnected', (data) => {
    console.warn('🔌 WebSocket disconnected:', data.reason);
  });

  useWebSocket('internal:error', (data) => {
    console.error('❌ WebSocket error:', data.error);
  });

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  return null; // This component doesn't render anything
}
