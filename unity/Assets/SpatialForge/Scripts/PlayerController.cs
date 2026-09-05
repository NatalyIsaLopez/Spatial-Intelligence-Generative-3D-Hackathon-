using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(CharacterController))]
public sealed class PlayerController : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 4.5f;
    [SerializeField] private float turnSpeed = 12f;
    [SerializeField] private float gravity = -18f;

    private CharacterController controller;
    private float verticalVelocity;

    public bool CanMove { get; private set; } = true;

    private void Awake()
    {
        controller = GetComponent<CharacterController>();
    }

    private void Update()
    {
        ApplyGravity();

        if (!CanMove)
        {
            controller.Move(Vector3.up * verticalVelocity * Time.deltaTime);
            return;
        }

        Vector2 input = ReadMoveInput();
        Vector3 move = CameraRelativeMove(input);

        if (move.sqrMagnitude > 0.001f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(move, Vector3.up);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, turnSpeed * Time.deltaTime);
        }

        controller.Move((move * moveSpeed + Vector3.up * verticalVelocity) * Time.deltaTime);
    }

    public void SetMovementEnabled(bool enabled)
    {
        CanMove = enabled;
    }

    private void ApplyGravity()
    {
        if (controller.isGrounded && verticalVelocity < 0f)
        {
            verticalVelocity = -1f;
        }
        else
        {
            verticalVelocity += gravity * Time.deltaTime;
        }
    }

    private static Vector2 ReadMoveInput()
    {
        Keyboard keyboard = Keyboard.current;
        if (keyboard == null)
        {
            return Vector2.zero;
        }

        Vector2 input = Vector2.zero;
        if (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed) input.y += 1f;
        if (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed) input.y -= 1f;
        if (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed) input.x += 1f;
        if (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed) input.x -= 1f;
        return Vector2.ClampMagnitude(input, 1f);
    }

    private static Vector3 CameraRelativeMove(Vector2 input)
    {
        if (input.sqrMagnitude < 0.001f)
        {
            return Vector3.zero;
        }

        Transform cameraTransform = Camera.main != null ? Camera.main.transform : null;
        Vector3 forward = cameraTransform != null ? cameraTransform.forward : Vector3.forward;
        Vector3 right = cameraTransform != null ? cameraTransform.right : Vector3.right;
        forward.y = 0f;
        right.y = 0f;
        forward.Normalize();
        right.Normalize();

        return right * input.x + forward * input.y;
    }
}
