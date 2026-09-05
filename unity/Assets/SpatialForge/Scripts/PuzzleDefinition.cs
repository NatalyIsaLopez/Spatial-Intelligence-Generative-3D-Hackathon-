using System;
using UnityEngine;

[Serializable]
public sealed class PuzzleDefinition
{
    public string id = "level-1-stream";
    public string levelName = "The Stream";
    public string obstacleId = "river";
    public string prompt = "Water cuts across the path. What could hold still across the gap?";
    public string solutionId = "bridge";
    public string solutionLabel = "a bridge";
    public string rewardId = "strawberry";
    public string rewardLabel = "strawberries";
    public GameObject solutionObject;
    public GameObject rewardObject;
}
