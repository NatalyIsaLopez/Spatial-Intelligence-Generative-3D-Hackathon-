using UnityEngine;
using UnityEngine.UI;

public sealed class AdventureProgress : MonoBehaviour
{
    [SerializeField] private Text pouchText;
    [SerializeField] private Text statusText;
    [SerializeField] private GameObject finalGateBlocker;
    [SerializeField] private GameObject goldenStrawberry;

    private bool hasStrawberry;
    private bool hasBlueberry;
    private bool hasWatermelon;
    private bool finaleComplete;

    public bool HasFruit(string rewardId)
    {
        return rewardId == "strawberry" && hasStrawberry
            || rewardId == "blueberry" && hasBlueberry
            || rewardId == "watermelon" && hasWatermelon;
    }

    public bool HasAllFruit => hasStrawberry && hasBlueberry && hasWatermelon;
    public bool FinaleComplete => finaleComplete;

    private void Start()
    {
        if (goldenStrawberry != null) goldenStrawberry.SetActive(false);
        Refresh();
    }

    public void RecordFruit(string rewardId)
    {
        if (rewardId == "strawberry") hasStrawberry = true;
        if (rewardId == "blueberry") hasBlueberry = true;
        if (rewardId == "watermelon") hasWatermelon = true;

        Refresh();
        if (statusText != null)
        {
            statusText.text = HasAllFruit
                ? "The pouch is full. Follow the path to the glade and deliver the golden strawberry."
                : "The " + rewardId + " settles into the Journey Pouch.";
        }
    }

    public void DeliverGoldenStrawberry()
    {
        if (!HasAllFruit || finaleComplete)
        {
            if (statusText != null)
            {
                statusText.text = "The glade is listening, but the Journey Pouch is not full yet.";
            }
            return;
        }

        finaleComplete = true;
        if (goldenStrawberry != null) goldenStrawberry.SetActive(false);
        if (statusText != null)
        {
            statusText.text = "Gift delivered. The journey glows back at you.";
        }
        Refresh();
    }

    private void Refresh()
    {
        if (pouchText != null)
        {
            pouchText.text = "Journey Pouch\n"
                + "Strawberry " + Mark(hasStrawberry) + "\n"
                + "Blueberry " + Mark(hasBlueberry) + "\n"
                + "Watermelon " + Mark(hasWatermelon);
        }

        if (finalGateBlocker != null) finalGateBlocker.SetActive(!HasAllFruit);
        if (goldenStrawberry != null && HasAllFruit && !finaleComplete) goldenStrawberry.SetActive(true);
    }

    private static string Mark(bool collected)
    {
        return collected ? "\u2713" : "\u25cb";
    }
}
