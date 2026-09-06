using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

public sealed class PuzzleRuntime : MonoBehaviour
{
    [SerializeField] private PuzzleDefinition puzzle = new PuzzleDefinition();
    [SerializeField] private PlayerController player;
    [SerializeField] private SketchbookController sketchbook;
    [SerializeField] private AdventureProgress progress;
    [SerializeField] private GameObject gapBlocker;
    [SerializeField] private Text statusText;
    [SerializeField] private Text hudText;
    [SerializeField] private string requiredRewardId;

    private bool playerInZone;
    private bool puzzleAvailable;
    private bool solutionRevealed;
    private bool completed;

    public PuzzleDefinition CurrentPuzzle => puzzle;
    public bool IsSketchbookOpen { get; private set; }
    public bool IsPuzzleAvailable => puzzleAvailable;
    public bool IsSolutionRevealed => solutionRevealed;
    public bool IsCompleted => completed;

    private void Start()
    {
        if (puzzle.solutionObject != null) puzzle.solutionObject.SetActive(false);
        if (puzzle.rewardObject != null) puzzle.rewardObject.SetActive(false);
        if (gapBlocker != null) gapBlocker.SetActive(true);
        if (sketchbook != null) sketchbook.Initialize();

        SetCursorForPlay();
        RefreshSketchbookAvailability();
    }

    private void Update()
    {
        if (playerInZone)
        {
            UpdateAvailability();
        }

        Keyboard keyboard = Keyboard.current;
        if (keyboard == null)
        {
            return;
        }

        if (IsSketchbookOpen && keyboard.escapeKey.wasPressedThisFrame)
        {
            CloseSketchbook();
        }
        else if (!IsSketchbookOpen && puzzleAvailable && keyboard.eKey.wasPressedThisFrame)
        {
            OpenSketchbook();
        }
    }

    public void SetPuzzleAvailable(bool available)
    {
        playerInZone = available;
        UpdateAvailability();
        RefreshStatus();
    }

    public void OpenSketchbook()
    {
        if (!puzzleAvailable || completed || sketchbook == null)
        {
            return;
        }

        IsSketchbookOpen = true;
        if (player != null) player.SetMovementEnabled(false);
        SetCursorForUi();
        sketchbook.Show(this, puzzle);
        RefreshStatus();
    }

    public void CloseSketchbook()
    {
        IsSketchbookOpen = false;
        if (player != null) player.SetMovementEnabled(true);
        SetCursorForPlay();
        if (sketchbook != null) sketchbook.Hide();
        RefreshSketchbookAvailability();
        RefreshStatus();
    }

    public void SubmitSolution(string solutionId)
    {
        if (!IsSketchbookOpen)
        {
            return;
        }

        if (solutionId == puzzle.solutionId)
        {
            RevealSolution();
            CloseSketchbook();
        }
        else if (sketchbook != null)
        {
            sketchbook.ShowFeedback("That idea belongs to another place. Try the sketch this obstacle is asking for.");
        }
    }

    public void CollectReward()
    {
        if (!solutionRevealed || completed)
        {
            return;
        }

        completed = true;
        puzzleAvailable = false;
        if (puzzle.rewardObject != null) puzzle.rewardObject.SetActive(false);
        if (progress != null) progress.RecordFruit(puzzle.rewardId);
        RefreshSketchbookAvailability();
        RefreshStatus();
    }

    private void RevealSolution()
    {
        solutionRevealed = true;
        if (puzzle.solutionObject != null) puzzle.solutionObject.SetActive(true);
        if (gapBlocker != null) gapBlocker.SetActive(false);
        if (puzzle.rewardObject != null) puzzle.rewardObject.SetActive(true);
        UpdateAvailability();
        RefreshStatus();
    }

    private void UpdateAvailability()
    {
        puzzleAvailable = playerInZone && !completed && !solutionRevealed && HasRequiredReward();
        RefreshSketchbookAvailability();
    }

    private bool HasRequiredReward()
    {
        return string.IsNullOrEmpty(requiredRewardId) || progress == null || progress.HasFruit(requiredRewardId);
    }

    private void RefreshSketchbookAvailability()
    {
        if (sketchbook != null)
        {
            sketchbook.SetAvailableRuntime(this, puzzleAvailable && !IsSketchbookOpen);
        }
    }

    private void RefreshStatus()
    {
        if (statusText != null)
        {
            if (completed)
            {
                statusText.text = "You found the " + puzzle.rewardLabel + ". A small piece of belonging comes with you.";
            }
            else if (solutionRevealed)
            {
                statusText.text = puzzle.revealedHint;
            }
            else if (IsSketchbookOpen)
            {
                statusText.text = "The sketchbook is open. Choose the idea the character imagines.";
            }
            else if (playerInZone && !HasRequiredReward())
            {
                statusText.text = puzzle.lockedHint;
            }
            else if (puzzleAvailable)
            {
                statusText.text = puzzle.approachHint;
            }
            else if (playerInZone)
            {
                statusText.text = "You can wander away or keep exploring the path.";
            }
        }

        if (hudText != null)
        {
            hudText.text = completed ? puzzle.levelName + " complete" : puzzle.levelName;
        }
    }

    private static void SetCursorForUi()
    {
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }

    private static void SetCursorForPlay()
    {
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }
}
