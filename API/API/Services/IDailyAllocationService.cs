using System.Threading.Tasks;

namespace API.Services
{
    public interface IDailyAllocationService
    {
        Task<(bool success, int allocatedCount, int reassignedCount, string message)> PerformDailyAllocationForUniversityAsync(int universityId);
        Task<int> PerformReassignmentForUniversityAsync(int universityId);
        Task<(int totalAllocated, int totalReassigned)> PerformDailyAllocationForAllUniversitiesAsync();
    }
}
