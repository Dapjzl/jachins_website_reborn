// accessibility helpers
// - add descriptive alt text to images missing alt
// - make clickable images keyboard-accessible
// - ensure skip-link focus visibility

(function(){
  function makeImagesAccessible(){
    var imgs = document.querySelectorAll('img');
    imgs.forEach(function(img){
      // add alt if missing or empty
      if(!img.hasAttribute('alt') || img.getAttribute('alt').trim() === ''){
        try{
          var name = img.src.split('/').pop().split('?')[0];
          var text = name.replace(/[-_0-9]+/g,' ').replace(/\.[^/.]+$/, '');
          text = text.replace(/\b(?:jpg|jpeg|png|gif|svg)\b/gi, '');
          text = text.trim();
          if(!text) text = 'Decorative image';
          img.setAttribute('alt', text);
        }catch(e){
          img.setAttribute('alt','Image');
        }
      }

      // if image has onclick, make it keyboard accessible
      if(img.hasAttribute('onclick')){
        img.setAttribute('role','button');
        if(!img.hasAttribute('tabindex')) img.setAttribute('tabindex','0');
        // simulate click on Enter/Space
        img.addEventListener('keydown', function(e){
          if(e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar'){
            e.preventDefault();
            img.click();
          }
        });
      }
    });
  }

  // skip-link support removed (skip link not present)
  function ensureSkipLink(){
    return;
  }

  // run on DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      makeImagesAccessible();
      ensureSkipLink();
    });
  } else {
    makeImagesAccessible();
    ensureSkipLink();
  }
})();
