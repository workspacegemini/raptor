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
  Target,
  Search,
  Edit,
  Trash2,
  Award,
  TrendingUp,
  BookOpen,
  Users,
  ChevronRight,
} from 'lucide-react';
import { Skill, CompetencyLevel } from '@/types';
import { formatDate } from '@/lib/utils';

export default function SkillsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch skills
  const { data: skills, isLoading } = useQuery<Skill[]>({
    queryKey: ['skills', categoryFilter],
    queryFn: async () => {
      const params = categoryFilter !== 'all' ? { category: categoryFilter } : {};
      const response = await apiClient.getSkills(params);
      return response.data || response;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteSkill(id),
    onSuccess: () => {
      toast.success('Skill deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete skill');
    },
  });

  const filteredSkills = skills?.filter((skill) =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique categories
  const categories = Array.from(
    new Set(skills?.map((s) => s.category).filter(Boolean) as string[])
  );

  // Organize skills by hierarchy
  const rootSkills = filteredSkills?.filter((skill) => !skill.parentSkillId) || [];
  const childSkills = filteredSkills?.filter((skill) => skill.parentSkillId) || [];

  const getChildSkills = (parentId: string) => {
    return childSkills.filter((skill) => skill.parentSkillId === parentId);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete skill "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getCategoryColor = (category: string | undefined) => {
    if (!category) return 'bg-gray-100 text-gray-800';
    const colors: Record<string, string> = {
      Technical: 'bg-blue-100 text-blue-800',
      Leadership: 'bg-purple-100 text-purple-800',
      Communication: 'bg-green-100 text-green-800',
      Safety: 'bg-red-100 text-red-800',
      Operations: 'bg-orange-100 text-orange-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const SkillCard = ({ skill, level = 0 }: { skill: Skill; level?: number }) => {
    const children = getChildSkills(skill.id);
    const marginLeft = level * 24;

    return (
      <div key={skill.id} style={{ marginLeft: `${marginLeft}px` }}>
        <Card className="mb-3 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {level > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                    {skill.category && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(
                          skill.category
                        )}`}
                      >
                        {skill.category}
                      </span>
                    )}
                    {level === 0 && <Badge variant="outline">Root</Badge>}
                    {children.length > 0 && (
                      <Badge variant="secondary">{children.length} sub-skills</Badge>
                    )}
                  </div>
                  {skill.description && (
                    <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Created {formatDate(skill.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(skill.id, skill.name)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {children.map((child) => (
          <SkillCard key={child.id} skill={child} level={level + 1} />
        ))}
      </div>
    );
  };

  // Category statistics
  const categoryStats = skills?.reduce((acc, skill) => {
    const cat = skill.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Skills</h1>
          <p className="text-gray-500 mt-1">
            Manage competency-based skill taxonomy and progression
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      </div>

      {/* Competency Level Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Competency Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {['AWARE', 'NOVICE', 'COMPETENT', 'PROFICIENT', 'EXPERT'].map((level, index) => (
              <div key={level} className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                  {index + 1}
                </div>
                <span className="text-sm font-medium">{level}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
            <Target className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skills?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">{rootSkills.length} root skills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Award className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-gray-500 mt-1">Skill categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sub-Skills</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{childSkills.length}</div>
            <p className="text-xs text-gray-500 mt-1">Hierarchical skills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Category</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoryStats
                ? Math.max(...Object.values(categoryStats))
                : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {categoryStats
                ? Object.entries(categoryStats).sort((a, b) => b[1] - a[1])[0]?.[0]
                : 'N/A'}
            </p>
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
                  placeholder="Search skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills Hierarchy */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : !filteredSkills || filteredSkills.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No skills found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first skill'}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Skill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Skill Taxonomy</h2>
            <p className="text-sm text-gray-500">
              Showing {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-3">
            {rootSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
            {/* Orphaned skills (have parentSkillId but parent not found) */}
            {childSkills
              .filter((skill) => !skills?.find((s) => s.id === skill.parentSkillId))
              .map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
