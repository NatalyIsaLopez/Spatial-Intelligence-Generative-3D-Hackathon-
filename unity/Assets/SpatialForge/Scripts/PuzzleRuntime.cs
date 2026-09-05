using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

public sealed class PuzzleRuntime : MonoBehaviour
{
    [SerializeField] private PuzzleDefinition puzzle = new PuzzleDefinition();
    [SerializeField] private PlayerController player;
    [SerializeField] private SketchbookController sketchbook;
    [SerializeField] private GameObject gapBlocker;
    [SerializeField] private Text statusText;
    [SerializeField] private Text hudText;

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
        if (sketchbook != null) sketchbook.Initialize(this);

        SetCursorForPlay();
        RefreshStatus();
    }

    private void Update()
    {
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
        if (completed)
        {
            puzzleAvailable = false;
        }
        else
        {
            puzzleAvailable = available;
        }

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
        sketchbook.Show(puzzle);
        RefreshStatus();
    }

    public void CloseSketchbook()
    {
        IsSketchbookOpen = false;
        if (player != null) player.SetMovementEnabled(true);
        SetCursorForPlay();
        if (sketchbook != null) sketchbook.Hide();
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
            sketchbook.ShowFeedback("That idea belongs to another place. Try the sketch that holds still across water.");
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
        RefreshStatus();
    }

    private void RevealSolution()
    {
        solutionRevealed = true;
        if (puzzle.solutionObject != null) puzzle.solutionObject.SetActive(true);
        if (gapBlocker != null) gapBlocker.SetActive(false);
        if (puzzle.rewardObject != null) puzzle.rewardObject.SetActive(true);
        RefreshStatus();
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
                statusText.text = "The " + puzzle.solutionLabel + " is real now. Cross the stream and collect the " + puzzle.rewardLabel + ".";
            }
            else if (IsSketchbookOpen)
            {
                statusText.text = "The sketchbook is open. Choose the idea the character imagines.";
            }
            else if (puzzleAvailable)
            {
                statusText.text = "Press E or use the sketchbook button to imagine a way across.";
            }
            else
            {
                statusText.text = "Explore the path. The stream ahead is too quick to step through.";
            }
        }

        if (hudText != null)
        {
            hudText.text = completed ? "Level 1 complete" : "Level 1: " + puzzle.levelName;
        }

        if (sketchbook != null)
        {
            sketchbook.SetOpenAvailable(puzzleAvailable && !IsSketchbookOpen && !solutionRevealed && !completed);
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
