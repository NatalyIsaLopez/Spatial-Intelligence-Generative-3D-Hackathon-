using UnityEngine;

public sealed class FollowCamera : MonoBehaviour
{
    [SerializeField] private Transform target;
    [SerializeField] private Vector3 offset = new Vector3(0f, 6f, -8f);
    [SerializeField] private float positionSmoothTime = 0.12f;
    [SerializeField] private float lookHeight = 1.1f;

    private Vector3 velocity;

    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
    }

    private void LateUpdate()
    {
        if (target == null)
        {
            return;
        }

        Vector3 desiredPosition = target.position + offset;
        transform.position = Vector3.SmoothDamp(transform.position, desiredPosition, ref velocity, positionSmoothTime);
        transform.LookAt(target.position + Vector3.up * lookHeight);
    }
}
