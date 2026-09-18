// DOM Shield: Bulletproof protection against Google Translate, browser extensions
// (Grammarly, LastPass, Dashlane, etc.) and external DOM mutations that cause React
// reconciliation crashes ("Failed to execute 'removeChild' on 'Node'").

if (typeof window !== 'undefined' && typeof Node === 'function' && Node.prototype) {
  const origRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (!child || child.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[DOM SHIELD] Blocked removeChild on mismatched node/parent', child, this);
      }
      return child;
    }
    try {
      return origRemoveChild.call(this, child) as T;
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[DOM SHIELD] Intercepted removeChild exception:', err);
      }
      return child;
    }
  };

  const origInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[DOM SHIELD] Blocked insertBefore with mismatched referenceNode', referenceNode, this);
      }
      try {
        return origInsertBefore.call(this, newNode, null) as T;
      } catch (e) {
        return newNode;
      }
    }
    try {
      return origInsertBefore.call(this, newNode, referenceNode) as T;
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[DOM SHIELD] Intercepted insertBefore exception:', err);
      }
      return newNode;
    }
  };

  const origReplaceChild = Node.prototype.replaceChild;
  if (origReplaceChild) {
    Node.prototype.replaceChild = function <T extends Node>(newChild: Node, oldChild: T): T {
      if (!oldChild || oldChild.parentNode !== this) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[DOM SHIELD] Blocked replaceChild on mismatched oldChild', oldChild, this);
        }
        return oldChild;
      }
      try {
        return origReplaceChild.call(this, newChild, oldChild) as T;
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[DOM SHIELD] Intercepted replaceChild exception:', err);
        }
        return oldChild;
      }
    };
  }
}

export {};
