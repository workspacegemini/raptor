'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Briefcase,
  Search,
  Edit,
  Trash2,
  Users,
  ChevronRight,
  Building,
  TrendingUp,
} from 'lucide-react';
import { Team } from '@/types';
import { formatDate } from '@/lib/utils';

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch teams
  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await apiClient.getTeams();
      return response.data || response;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTeam(id),
    onSuccess: () => {
      toast.success('Team deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete team');
    },
  });

  const filteredTeams = teams?.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Organize teams by hierarchy
  const rootTeams = filteredTeams?.filter((team) => !team.parentTeamId) || [];
  const childTeams = filteredTeams?.filter((team) => team.parentTeamId) || [];

  const getChildTeams = (parentId: string) => {
    return childTeams.filter((team) => team.parentTeamId === parentId);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete team "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const TeamCard = ({ team, level = 0 }: { team: Team; level?: number }) => {
    const children = getChildTeams(team.id);
    const marginLeft = level * 24;

    return (
      <div key={team.id} style={{ marginLeft: `${marginLeft}px` }}>
        <Card className="mb-3 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {level > 0 && (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    {level === 0 && <Badge variant="outline">Root</Badge>}
                    {children.length > 0 && (
                      <Badge variant="secondary">{children.length} sub-teams</Badge>
                    )}
                  </div>
                  {team.description && (
                    <p className="text-sm text-gray-500 mt-1">{team.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {team._count?.members || 0} members
                    </span>
                    <span>Created {formatDate(team.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Users className="h-4 w-4 mr-1" />
                  Members
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(team.id, team.name)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {children.map((child) => (
          <TeamCard key={child.id} team={child} level={level + 1} />
        ))}
      </div>
    );
  };

  const totalMembers = teams?.reduce((sum, team) => sum + (team._count?.members || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-500 mt-1">
            Manage organizational structure and team hierarchies
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Building className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {rootTeams.length} root teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembers}</div>
            <p className="text-xs text-gray-500 mt-1">
              Across all teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Team Size</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teams && teams.length > 0 ? (totalMembers / teams.length).toFixed(1) : 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Members per team
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Teams Hierarchy */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : !filteredTeams || filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No teams found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Get started by creating your first team'}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Team Hierarchy</h2>
            <p className="text-sm text-gray-500">
              Showing {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="space-y-3">
            {rootTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
            {/* Orphaned teams (have parentTeamId but parent not found) */}
            {childTeams.filter(team =>
              !teams?.find(t => t.id === team.parentTeamId)
            ).map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
