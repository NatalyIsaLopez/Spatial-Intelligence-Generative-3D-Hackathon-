using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using System.Linq;

// One-shot demo wiring: swaps placeholder primitives for the real converted models.
// Safe to run repeatedly - it removes any visual child it previously created.
public static class WireRealModels
{
    const string ModelDir = "Assets/SpatialForge/Models/Converted/";
    const string VisualName = "__RealModel";

    struct Swap
    {
        public string target;
        public string model;
        public float scale;
        public float yOffset;
        public float yRotation;
        public bool hideOriginal;
    }

    static readonly Swap[] Swaps = new Swap[]
    {
        new Swap { target = "Player",                 model = "character",  scale = 1.8f, yOffset = -0.10f, yRotation = 0f,  hideOriginal = true },
        new Swap { target = "Bridge Solution",        model = "bridge",     scale = 6.0f, yOffset =  0.30f, yRotation = 90f, hideOriginal = true },
        new Swap { target = "Visible Sketched Boat",  model = "boat",       scale = 4.0f, yOffset =  0.20f, yRotation = 90f, hideOriginal = true },
        new Swap { target = "Strawberry Reward",      model = "strawberry", scale = 1.0f, yOffset = 0f, yRotation = 0f, hideOriginal = true },
        new Swap { target = "Blueberry Reward",       model = "persimmon",  scale = 1.0f, yOffset = 0f, yRotation = 0f, hideOriginal = true },
        new Swap { target = "Watermelon Reward",      model = "melon",      scale = 1.0f, yOffset = 0f, yRotation = 0f, hideOriginal = true },
        new Swap { target = "Golden Strawberry Gift", model = "strawberry", scale = 1.0f, yOffset = 0f, yRotation = 0f, hideOriginal = true },
    };

    [MenuItem("Tools/Spatial Forge/Wire Real Models")]
    public static void Run()
    {
        int ok = 0, missing = 0;

        foreach (var s in Swaps)
        {
            var go = Find(s.target);
            if (go == null) { Debug.LogWarning("[WireRealModels] no GameObject named " + s.target); missing++; continue; }

            var mesh = LoadMesh(s.model);
            if (mesh == null) { Debug.LogWarning("[WireRealModels] no mesh for " + s.model); missing++; continue; }

            var old = go.transform.Find(VisualName);
            if (old != null) Object.DestroyImmediate(old.gameObject);

            var vis = new GameObject(VisualName);
            Undo.RegisterCreatedObjectUndo(vis, "Wire Real Models");
            vis.transform.SetParent(go.transform, false);
            vis.transform.localPosition = new Vector3(0f, s.yOffset, 0f);
            vis.transform.localRotation = Quaternion.Euler(0f, s.yRotation, 0f);

            var p = go.transform.lossyScale;
            vis.transform.localScale = new Vector3(
                s.scale / Mathf.Max(0.0001f, p.x),
                s.scale / Mathf.Max(0.0001f, p.y),
                s.scale / Mathf.Max(0.0001f, p.z));

            vis.AddComponent<MeshFilter>().sharedMesh = mesh;
            var mr = vis.AddComponent<MeshRenderer>();
            var mat = LoadMaterial(s.model);
            if (mat != null) mr.sharedMaterial = mat;

            if (s.hideOriginal)
            {
                var placeholder = go.GetComponent<MeshRenderer>();
                if (placeholder != null) placeholder.enabled = false;
            }

            ok++;
        }

        var ladderRoot = Find("Ladder Solution");
        if (ladderRoot != null)
        {
            foreach (var mr in ladderRoot.GetComponentsInChildren<MeshRenderer>(true))
                if (mr.gameObject.name.StartsWith("Visible Ladder")) mr.enabled = false;

            var oldL = ladderRoot.transform.Find(VisualName);
            if (oldL != null) Object.DestroyImmediate(oldL.gameObject);

            var mesh = LoadMesh("ladder");
            if (mesh != null)
            {
                var vis = new GameObject(VisualName);
                Undo.RegisterCreatedObjectUndo(vis, "Wire Real Models");
                vis.transform.SetParent(ladderRoot.transform, false);
                vis.transform.localPosition = new Vector3(0f, 1.7f, 23.2f);
                vis.transform.localRotation = Quaternion.Euler(-38f, 0f, 0f);
                vis.transform.localScale = Vector3.one * 9f;
                vis.AddComponent<MeshFilter>().sharedMesh = mesh;
                var mr2 = vis.AddComponent<MeshRenderer>();
                var mat = LoadMaterial("ladder");
                if (mat != null) mr2.sharedMaterial = mat;
                ok++;
            }
        }

        EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
        Debug.Log("[WireRealModels] done - " + ok + " wired, " + missing + " missing.");
    }

    static GameObject Find(string name)
    {
        return Resources.FindObjectsOfTypeAll<GameObject>()
            .FirstOrDefault(g => g.name == name && g.scene.IsValid() && g.hideFlags == HideFlags.None);
    }

    static Mesh LoadMesh(string model)
    {
        return AssetDatabase.LoadAllAssetsAtPath(ModelDir + model + ".obj").OfType<Mesh>().FirstOrDefault();
    }

    static Material LoadMaterial(string model)
    {
        return AssetDatabase.LoadAllAssetsAtPath(ModelDir + model + ".obj").OfType<Material>().FirstOrDefault();
    }
}
