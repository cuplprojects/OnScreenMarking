using System.Text.Json.Serialization;

namespace API.Models
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum ScriptStatus
    {
        pending,
        allocated,
        marking,
        in_progress,
        completed
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum AllocationStatus
    {
        allocated,
        assigned,
        in_progress,
        submitted,
        cancelled
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum MarkingStatus
    {
        draft,
        in_progress,
        submitted
    }
}
