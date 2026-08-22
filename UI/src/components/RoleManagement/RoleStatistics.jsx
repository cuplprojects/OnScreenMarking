import React, { useState, useEffect } from 'react';
import { Users, Shield, Lock, Zap } from 'lucide-react';
import roleService from '../../services/roleService';

export default function RoleStatistics() {
  const [stats, setStats] = useState({
    totalRoles: 0,
    totalPermissions: 0,
    activeRoles: 0,
    rolesWithHierarchy: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        roleService.getAllRoles(),
        roleService.getAllPermissions()
      ]);

      const roles = rolesData.data || [];
      const permissions = permissionsData.data || [];

      setStats({
        totalRoles: roles.length,
        totalPermissions: permissions.length,
        activeRoles: roles.filter(r => r.isActive).length,
        rolesWithHierarchy: roles.filter(r => r.hierarchyLevel > 0).length
      });
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch statistics');
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      icon: Shield,
      label: 'Total Roles',
      value: stats.totalRoles,
      color: 'blue',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Lock,
      label: 'Total Permissions',
      value: stats.totalPermissions,
      color: 'purple',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Zap,
      label: 'Active Roles',
      value: stats.activeRoles,
      color: 'green',
      bgColor: 'bg-green-50'
    },
    {
      icon: Users,
      label: 'Hierarchical Roles',
      value: stats.rolesWithHierarchy,
      color: 'orange',
      bgColor: 'bg-orange-50'
    }
  ];

  const colorClasses = {
    blue: 'text-blue-600',
    purple: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`${card.bgColor} rounded-lg border border-gray-200 p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{card.label}</p>
                <p className={`text-3xl font-bold ${colorClasses[card.color]} mt-2`}>
                  {card.value}
                </p>
              </div>
              <Icon className={`${colorClasses[card.color]} opacity-20`} size={40} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
