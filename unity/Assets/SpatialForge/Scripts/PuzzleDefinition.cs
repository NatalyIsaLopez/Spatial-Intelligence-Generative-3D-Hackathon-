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
    public string approachHint = "Press E or use the sketchbook button to imagine a way forward.";
    public string revealedHint = "The sketch is real now. Move through the changed world and collect the fruit.";
    public string lockedHint = "Something later in the journey is waiting for another fruit first.";
    public GameObject solutionObject;
    public GameObject rewardObject;
}
