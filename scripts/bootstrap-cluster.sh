#!/usr/bin/env bash
# Sets up a fresh Shopfront EKS cluster: storage, Argo CD, Argo Rollouts, Istio.
# Run AFTER `terraform apply` in infra/. Safe to re-run.
set -euo pipefail

REGION="us-east-1"
CLUSTER="shopfront"
ISTIO_VERSION=""   # empty = latest chart; or pin e.g. "1.24.0"

cd "$(git rev-parse --show-toplevel)"

for tool in aws kubectl helm; do
  command -v "$tool" >/dev/null || { echo "Missing tool: $tool"; exit 1; }
done

echo "==> Connecting kubectl to the cluster"
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER"
ctx="$(kubectl config current-context)"
case "$ctx" in
  *"$CLUSTER"*) ;;
  *) echo "Wrong kubectl context: $ctx"; exit 1 ;;
esac

echo "==> Waiting for nodes to be Ready"
kubectl wait --for=condition=Ready nodes --all --timeout=600s

echo "==> Storage class (gp3 default)"
kubectl apply -f k8s/storageclass.yaml
kubectl delete storageclass gp2 --ignore-not-found

echo "==> Argo CD"
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl wait --for=condition=Established crd/applications.argoproj.io --timeout=120s
kubectl -n argocd rollout status deployment/argocd-server --timeout=300s

echo "==> Argo Rollouts"
kubectl create namespace argo-rollouts --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argo-rollouts --server-side --force-conflicts \
  -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
kubectl wait --for=condition=Established crd/rollouts.argoproj.io --timeout=120s
kubectl -n argo-rollouts rollout status deployment/argo-rollouts --timeout=300s

echo "==> Istio"
helm repo add istio https://istio-release.storage.googleapis.com/charts >/dev/null 2>&1 || true
helm repo update >/dev/null
VER_FLAG=""
[ -n "$ISTIO_VERSION" ] && VER_FLAG="--version $ISTIO_VERSION"
helm upgrade --install istio-base istio/base -n istio-system --create-namespace --wait $VER_FLAG
helm upgrade --install istiod istio/istiod -n istio-system --wait $VER_FLAG

echo "==> Argo CD apps (dev + prod)"
kubectl apply -f k8s/argocd/

cat <<MSG

Done. Next:
  Argo CD UI:  kubectl port-forward svc/argocd-server -n argocd 8080:443
  Password:    kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo
  (Do not paste the password anywhere.)
MSG
