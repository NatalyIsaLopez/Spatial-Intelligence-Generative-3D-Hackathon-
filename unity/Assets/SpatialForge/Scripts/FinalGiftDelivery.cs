using UnityEngine;

public sealed class FinalGiftDelivery : MonoBehaviour
{
    [SerializeField] private AdventureProgress progress;

    private void Update()
    {
        transform.Rotate(0f, 70f * Time.deltaTime, 0f, Space.World);
    }

    private void OnTriggerEnter(Collider other)
    {
        if (other.GetComponent<PlayerController>() != null && progress != null)
        {
            progress.DeliverGoldenStrawberry();
        }
    }
}
