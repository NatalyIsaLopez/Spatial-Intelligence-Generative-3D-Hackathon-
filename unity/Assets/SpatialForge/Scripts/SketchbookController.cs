using UnityEngine;
using UnityEngine.UI;

public sealed class SketchbookController : MonoBehaviour
{
    [SerializeField] private GameObject panel;
    [SerializeField] private Button openButton;
    [SerializeField] private Button closeButton;
    [SerializeField] private Button bridgeChoiceButton;
    [SerializeField] private Text storyPrompt;
    [SerializeField] private Text feedbackText;
    [SerializeField] private Text bridgeChoiceLabel;

    private PuzzleRuntime availableRuntime;
    private PuzzleRuntime currentRuntime;
    private bool initialized;

    public void Initialize()
    {
        if (initialized)
        {
            return;
        }

        initialized = true;
        if (openButton != null) openButton.onClick.AddListener(OpenAvailablePuzzle);
        if (closeButton != null) closeButton.onClick.AddListener(CloseCurrentPuzzle);
        if (bridgeChoiceButton != null) bridgeChoiceButton.onClick.AddListener(SubmitCurrentSolution);

        Hide();
        SetOpenAvailable(false);
    }

    public void Show(PuzzleRuntime runtime, PuzzleDefinition puzzle)
    {
        currentRuntime = runtime;
        if (panel != null) panel.SetActive(true);
        if (storyPrompt != null) storyPrompt.text = puzzle.prompt;
        if (feedbackText != null) feedbackText.text = "";
        if (bridgeChoiceLabel != null) bridgeChoiceLabel.text = "Sketch " + puzzle.solutionLabel;
    }

    public void Hide()
    {
        if (panel != null) panel.SetActive(false);
    }

    public void SetAvailableRuntime(PuzzleRuntime runtime, bool available)
    {
        if (available)
        {
            availableRuntime = runtime;
        }
        else if (availableRuntime == runtime)
        {
            availableRuntime = null;
        }

        SetOpenAvailable(availableRuntime != null);
    }

    public void SetOpenAvailable(bool available)
    {
        if (openButton == null)
        {
            return;
        }

        openButton.interactable = available;
        Text label = openButton.GetComponentInChildren<Text>();
        if (label != null)
        {
            label.text = available ? "Open Sketchbook" : "Find a puzzle";
        }
    }

    public void ShowFeedback(string message)
    {
        if (feedbackText != null) feedbackText.text = message;
    }

    private void OpenAvailablePuzzle()
    {
        if (availableRuntime != null)
        {
            availableRuntime.OpenSketchbook();
        }
    }

    private void CloseCurrentPuzzle()
    {
        if (currentRuntime != null)
        {
            currentRuntime.CloseSketchbook();
        }
    }

    private void SubmitCurrentSolution()
    {
        if (currentRuntime != null)
        {
            currentRuntime.SubmitSolution(currentRuntime.CurrentPuzzle.solutionId);
        }
    }
}
