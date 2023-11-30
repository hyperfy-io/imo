import React, { useRef, useState, useEffect } from 'react'

export function useDropZone(elemRef) {
  const [hover, setHover] = useState(false)
  const [file, setFile] = useState(null)
  useEffect(() => {
    const elem = elemRef.hasOwnProperty('current') ? elemRef.current : elemRef
    let target = null
    const onDragOver = e => {
      //   console.log('onDragOver', e)
      e.preventDefault()
    }
    const onDragEnter = e => {
      //   console.log('onDragEnter', e)
      target = e.target
      setFile(null)
      setHover(true)
    }
    const onDragLeave = e => {
      //   console.log('onDragLeave', e)
      if (e.target === target) {
        setHover(false)
      }
    }
    const onDrop = async e => {
      //   console.log('onDrop', e)
      e.preventDefault()
      setHover(false)
      let file
      if (e.dataTransfer.items) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i]
          if (item.kind === 'file') {
            file = item.getAsFile()
          }
        }
      } else {
        file = e.dataTransfer.files[0]
      }
      const ext = file.name.split('.').pop()
      if (ext !== 'glb') file = null
      setFile(file)
    }
    elem.addEventListener('dragover', onDragOver)
    elem.addEventListener('dragenter', onDragEnter)
    elem.addEventListener('dragleave', onDragLeave)
    elem.addEventListener('drop', onDrop)
    return () => {
      elem.removeEventListener('dragover', onDragOver)
      elem.removeEventListener('dragenter', onDragEnter)
      elem.removeEventListener('dragleave', onDragLeave)
      elem.removeEventListener('drop', onDrop)
    }
  }, [])
  return { hover, file }
}
