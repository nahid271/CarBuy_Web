"use client"

import { useEffect } from "react"
import { useLanguage } from "@/lib/language-client"
import { translateUiText } from "../../../shared/ui-translations"

type Original = { source: string; shown: string }
const textOriginals = new WeakMap<Text, Original>()
const attributeOriginals = new WeakMap<Element, Map<string, Original>>()
const translatedAttributes = ["aria-label", "placeholder", "title", "alt"] as const
const skipped = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS", "CODE", "PRE"])

/** Localizes prerendered server copy and newly inserted client UI without changing
 * form values, listing identifiers, URL values or user-entered text. */
export function UiLanguageSurface() {
  const language = useLanguage()

  useEffect(() => {
    const skip = (element: Element | null) => {
      for (let current = element; current; current = current.parentElement) {
        if (skipped.has(current.tagName) || current.getAttribute("translate") === "no" ||
          current.hasAttribute("contenteditable")) return true
      }
      return false
    }
    const localizeText = (node: Text) => {
      if (skip(node.parentElement)) return
      const shown = node.nodeValue || ""
      const previous = textOriginals.get(node)
      const source = previous && shown === previous.shown ? previous.source : shown
      const translated = translateUiText(source, language)
      textOriginals.set(node, { source, shown: translated })
      if (translated !== shown) node.nodeValue = translated
    }
    const localizeAttributes = (element: Element) => {
      if (skip(element)) return
      let records = attributeOriginals.get(element)
      if (!records) { records = new Map(); attributeOriginals.set(element, records) }
      for (const name of translatedAttributes) {
        const shown = element.getAttribute(name)
        if (shown === null) continue
        const previous = records.get(name)
        const source = previous && shown === previous.shown ? previous.source : shown
        const translated = translateUiText(source, language)
        records.set(name, { source, shown: translated })
        if (translated !== shown) element.setAttribute(name, translated)
      }
    }
    const localizeTree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) { localizeText(root as Text); return }
      if (root.nodeType !== Node.ELEMENT_NODE) return
      const element = root as Element
      if (skip(element)) return
      localizeAttributes(element)
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode
        if (node.nodeType === Node.TEXT_NODE) localizeText(node as Text)
        else localizeAttributes(node as Element)
      }
    }

    localizeTree(document.head)
    localizeTree(document.body)
    const observer = new MutationObserver(changes => {
      for (const change of changes) {
        if (change.type === "characterData") localizeText(change.target as Text)
        else if (change.type === "attributes") localizeAttributes(change.target as Element)
        else for (const node of change.addedNodes) localizeTree(node)
      }
    })
    observer.observe(document.body, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: [...translatedAttributes],
    })
    observer.observe(document.head, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: [...translatedAttributes],
    })
    return () => observer.disconnect()
  }, [language])

  return null
}

export function LocalizedText({ text }: { text: string }) {
  const language = useLanguage()
  return <>{translateUiText(text, language)}</>
}
