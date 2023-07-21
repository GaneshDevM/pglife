const signin_btn=document.getElementById("sign-in")
const signup_btn=document.getElementById("sign-up")

if(signin_btn&&signup_btn){

    signin_btn.addEventListener("click", function(e){
        $('#LoginModal').modal('show')
    })
    
    $('.close-login').on("click", function(e){
        $('#LoginModal').modal('hide')
    })
    
    
    signup_btn.addEventListener("click", function(e){
        $('#SignupModal').modal('show')
    })
    $('.close-signup').on("click", function(e){
        $('#SignupModal').modal('hide')
    })  


$('#modal-login').on('click',function(event){
    $('#SignupModal').modal('hide')
    $('#LoginModal').modal('show')
})

$('#modal-signup').on('click',function(event){
    $('#LoginModal').modal('hide')
    $('#SignupModal').modal('show')
})
}

function markfav(event) {
  let imgSrc = this.getAttribute('src');
  let parentNode = this.parentNode;
  
  if (imgSrc === '/img/unliked.png') {
    ajaxFav(parentNode.querySelector('.PG-Name').textContent,parentNode.querySelector('.PG-Address').textContent,this)
  } else {
     ajaxUnFav(parentNode.querySelector('.PG-Name').textContent,parentNode.querySelector('.PG-Address').textContent,this)
  }
}

function adding_favlisteners(){  
 let images = document.querySelectorAll('img.float-end');
  for (let i = 0; i < images.length; i++) {
    images[i].addEventListener('click',markfav);
  }
}

adding_favlisteners();  


function ajaxFav(PGname,PGaddress,image) {
    let xhr = new XMLHttpRequest();
    let url = '/favourites';
    let likedPG = {
      pgname: PGname,
      pgaddress: PGaddress
    };
    
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200 || xhr.status === 204) {
          if(xhr.responseText=='success')
          image.setAttribute('src', '/img/liked.png');
          else alert("login to add to fav");
        } else {
          alert('Error updating favourites');
        }
      }
    };
    xhr.send(JSON.stringify(likedPG));
}


function ajaxUnFav(PGname,PGaddress,image) {
    let xhr = new XMLHttpRequest();
    let url = '/unfavourites';
    let unlikedPG = {
      pgname: PGname,
      pgaddress: PGaddress
    };
    
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200 || xhr.status === 204) {
          image.setAttribute('src', '/img/unliked.png');
        } else {
          alert('Error updating favourites');
        }
      }
    };
    xhr.send(JSON.stringify(unlikedPG));
}


$('#filter').on("click", function() {
  $('#filterModel').modal('show');
})

$('#filter').on("click", function() {
  $('#filterModel').modal('show');
})

$('[data-dismiss="clearfilter"]').on("click",function() {
  ajaxFilter('clear')
  document.getElementById(document.getElementById("filter-form").elements['filter'].value).checked=false
})

$('[data-dismiss="filtermodal"]').on("click",function() {
  $('#filterModel').modal('hide');
})


$('[data-submit="filtermodal"]').on("click",function() {
  $('#filterModel').modal('hide');
  ajaxFilter(document.getElementById("filter-form").elements['filter'].value)
})

$('#asc-rent').on("click",function() {
  $('#filterModel').modal('hide');
  ajaxOrder('asc')
})

$('#desc-rent').on("click",function() {
  $('#filterModel').modal('hide');
  ajaxOrder('desc')
})

function ajaxFilter(gender) {
  let xhr = new XMLHttpRequest();
  let url = window.location.href + '/filter?gender=' + encodeURIComponent(gender);
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200 || xhr.status === 204) {
        if(xhr.responseText=='failure')
        alert("failed to filter");
        else{
          let parentElement = document.getElementById("card-holder");
          while (parentElement.firstChild) {
            parentElement.removeChild(parentElement.firstChild);
          }
          let responseArray = JSON.parse(xhr.response)
          if(responseArray.length!=0){
           responseArray.forEach(element => {
            let rating=``
            for(let i=1;i<=element.rating;i++) {
              rating+=`<span class="fa fa-star checked"></span>`
            } 
            for(let i=1;i<=Math.ceil(5-element.rating);i++) {
              rating+=`<span class="fa fa-star"></span>`
            } 
            parentElement.appendChild(
              document.createRange().createContextualFragment(`
                <div class="card">
                  <img class="my-5 mx-4" src="/img/properties/${element.img}" alt="Card image cap" height="200px">
                  <div class="mx-3 my-5" id="card-info">
                    <div class="rating-info">
                      ${rating}                 
                    </div>
                    <img src="/img/${element.choice}.png" width="30px" class="float-end">
                    <h5 class="PG-Name">${element.name}</h5>
                    <p class="PG-Address">${element.address}</p>
                    <div class="gender-restriction">
                      <img src="/img/${element.gender.toLowerCase()}.png" width="50px">
                    </div>
                    <div class="rent_info">
                      <h6 class="d-inline">Rs${element.rent}/-</h6><span> per month</span>
                    </div>
                    <div class="float-end">
                      <a href="/property_detail/${element.name}" class="btn btn-custom" style="margin-left:350px">View</a>
                    </div>
                  </div>
                </div>
              `)
            );
            adding_favlisteners();
           });
          }else{
            parentElement.innerHTML = '<p>No PGs found</p>';
          }
        }
      } else {
        alert('Error accessing info');
      }
    }
  };
  xhr.send();
}


function ajaxOrder(order) {
  let xhr = new XMLHttpRequest();
  let url = window.location.href + '/order?order=' + encodeURIComponent(order);
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200 || xhr.status === 204) {
        if(xhr.responseText=='failure')
        alert("failed to filter");
        else{
          let parentElement = document.getElementById("card-holder");
          while (parentElement.firstChild) {
            parentElement.removeChild(parentElement.firstChild);
          }
          let responseArray = JSON.parse(xhr.response)
          if(responseArray.length!=0){
           responseArray.forEach(element => {
            let rating=``
            for(let i=1;i<=element.rating;i++) {
              rating+=`<span class="fa fa-star checked"></span>`
            } 
            for(let i=1;i<=Math.ceil(5-element.rating);i++) {
              rating+=`<span class="fa fa-star"></span>`
            } 
            parentElement.appendChild(
              document.createRange().createContextualFragment(`
                <div class="card">
                  <img class="my-5 mx-4" src="/img/properties/${element.img}" alt="Card image cap" height="200px">
                  <div class="mx-3 my-5" id="card-info">
                    <div class="rating-info">
                      ${rating}                 
                    </div>
                    <img src="/img/${element.choice}.png" width="30px" class="float-end">
                    <h5 class="PG-Name">${element.name}</h5>
                    <p class="PG-Address">${element.address}</p>
                    <div class="gender-restriction">
                      <img src="/img/${element.gender.toLowerCase()}.png" width="50px">
                    </div>
                    <div class="rent_info">
                      <h6 class="d-inline">Rs${element.rent}/-</h6><span> per month</span>
                    </div>
                    <div class="float-end">
                      <a href="/property_detail/${element.name}" class="btn btn-custom" style="margin-left:350px">View</a>
                    </div>
                  </div>
                </div>
              `)
            );
            adding_favlisteners();
           });
          }else{
            parentElement.innerHTML = '<p>No PGs found</p>';
          }
        }
      } else {
        alert('Error accessing info');
      }
    }
  };
  xhr.send();
}
