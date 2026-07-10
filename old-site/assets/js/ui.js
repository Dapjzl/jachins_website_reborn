(function(){
  function onReady(fn){
    if(document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  onReady(function(){
    // back to top button
    var topBtn = document.createElement('button');
    topBtn.className = 'back-to-top';
    topBtn.setAttribute('aria-label', 'Back to top');
    topBtn.innerHTML = '\u25B2';
    document.body.appendChild(topBtn);

    topBtn.addEventListener('click', function(){
      window.scrollTo({top:0, behavior:'smooth'});
    });

    window.addEventListener('scroll', function(){
      if(window.scrollY > 400) topBtn.classList.add('visible');
      else topBtn.classList.remove('visible');
    });


    // add accessible label text for back-to-top (hidden, shown on hover)
    var topText = document.createElement('span');
    topText.className = 'back-to-top-text';
    topText.textContent = 'Scroll To Top';
    topBtn.appendChild(topText);

    topBtn.addEventListener('click', function(){
      topBtn.style.background = 'transparent';
      setTimeout(function(){ topBtn.style.background = ''; }, 600);
    });

    // Smooth scroll for internal anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var href = a.getAttribute('href');
        if(href.length > 1){
          var target = document.querySelector(href);
          if(target){
            e.preventDefault();
            target.scrollIntoView({behavior:'smooth'});
            target.setAttribute('tabindex','-1');
            target.focus();
          }
        }
      });
    });

  });
})();
