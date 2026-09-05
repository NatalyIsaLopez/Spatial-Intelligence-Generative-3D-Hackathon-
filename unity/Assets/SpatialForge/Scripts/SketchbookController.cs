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

    private PuzzleRuntime runtime;

    public void Initialize(PuzzleRuntime puzzleRuntime)
    {
        runtime = puzzleRuntime;

        if (openButton != null) openButton.onClick.AddListener(runtime.OpenSketchbook);
        if (closeButton != null) closeButton.onClick.AddListener(runtime.CloseSketchbook);
        if (bridgeChoiceButton != null) bridgeChoiceButton.onClick.AddListener(() => runtime.SubmitSolution("bridge"));

        Hide();
    }

    public void Show(PuzzleDefinition puzzle)
    {
        if (panel != null) panel.SetActive(true);
        if (storyPrompt != null) storyPrompt.text = puzzle.prompt;
        if (feedbackText != null) feedbackText.text = "";
        if (bridgeChoiceLabel != null) bridgeChoiceLabel.text = "Sketch " + puzzle.solutionLabel;
    }

    public void Hide()
    {
        if (panel != null) panel.SetActive(false);
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
}
