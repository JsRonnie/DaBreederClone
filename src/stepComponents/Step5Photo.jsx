import React, { useRef, useMemo } from 'react'

export default function Step5Photo({ data, updatePhoto }) {
  const inputRef = useRef(null)
  const file = data.photo || null

  const previewUrl = useMemo(() => {
    if (!file) return ''
    try {
      return URL.createObjectURL(file)
    } catch {
      return ''
    }
  }, [file])

  const onFiles = (flist) => {
    const f = flist?.[0]
    if (!f) return
    // simple guard: images only
    if (!f.type.startsWith('image/')) {
      alert('Please choose an image file (jpg, png, etc.).')
      return
    }
    updatePhoto?.(f)
  }

  return (
    <div className="step step-5">
      <h3 className="step-title">Profile Photo</h3>

      <div className="field">
        <label>Upload Dog Profile Picture</label>
        <div
          className="doc-drop"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
          onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
        >
          {!file && <p>Click or drag & drop a photo here (JPG/PNG)</p>}
          {file && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              {previewUrl && (
                <img src={previewUrl} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#444' }}>{file.name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); updatePhoto?.(null) }} style={{ background: 'none', border: 'none', color: '#c00', cursor: 'pointer', fontSize: 12 }}>Remove</button>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
      </div>

      <small className="upload-note">We’ll save the photo in Supabase Storage and link it to your dog’s profile.</small>
    </div>
  )
}
