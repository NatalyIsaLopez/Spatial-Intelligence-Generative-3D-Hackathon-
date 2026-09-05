using UnityEngine;

public sealed class RewardPickup : MonoBehaviour
{
    [SerializeField] private PuzzleRuntime runtime;

    private void Update()
    {
        transform.Rotate(0f, 90f * Time.deltaTime, 0f, Space.World);
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.GetComponent<PlayerController>() != null)
        {
            runtime.CollectReward();
        }
    }
}
