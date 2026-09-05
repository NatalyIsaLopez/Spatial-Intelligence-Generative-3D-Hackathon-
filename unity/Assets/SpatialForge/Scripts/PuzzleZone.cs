using UnityEngine;

public sealed class PuzzleZone : MonoBehaviour
{
    [SerializeField] private PuzzleRuntime runtime;

    private void OnTriggerEnter(Collider other)
    {
        if (other.GetComponent<PlayerController>() != null)
        {
            runtime.SetPuzzleAvailable(true);
        }
    }

    private void OnTriggerExit(Collider other)
    {
        if (other.GetComponent<PlayerController>() != null)
        {
            runtime.SetPuzzleAvailable(false);
        }
    }
}
