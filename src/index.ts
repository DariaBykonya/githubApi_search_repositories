import './main.scss';

interface IRepository {
  name: string;
  owner: {
    login: string;
  };
  stargazers_count: number;
  description?: string;
  html_url?: string;
  forks_count?: number;
  open_issues_count?: number;
  language?: string;
  [key: string]: any;
}

// Определение типов данных
type DebouncedFunction<T extends (...args: any[]) => any> = {
  (this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T>;
  cancel: () => void;
};


document.addEventListener('DOMContentLoaded', function() {
  const resultsContainer = document.getElementById('results-container');
  const searchInput = document.getElementById('search-input') as HTMLInputElement;


  const loader = document.createElement('div');
  loader.classList.add('loader');
  resultsContainer.append(loader);

  const showLoader = () => loader.classList.add('visible');
  const hideLoader = () => loader.classList.remove('visible');

  // Реализация функции debounce
  const debounce = <T extends (...args: any[]) => any>(
    fn: T,
    ms: number
  ) => {
    let counter: ReturnType<typeof setTimeout>;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
      clearTimeout(counter);
      counter = setTimeout(() => fn.apply(this, args), ms);
    } as DebouncedFunction<T>;
  };

  // Функция для выполнения запроса к API GitHub
  const searchRepositories = async (query: string): Promise<any> => {
    showLoader();
    
    try {
      const response = await fetch(`https://api.github.com/search/repositories?q=${query}`);
      if (!response.ok) {
        if (response.status === 422) {
          displayNoneQuery(`Incorrect request ${response.status}`);
        } else {
          displayNoneQuery(`Request execution error ${response.status}`);
        }
        return [];
      }
      const data = await response.json();
      return data.items;
    } catch (error) {
      displayNoneQuery(`Request execution error ${error.status}: ${error.message}`);
      return [];
    } finally {
      hideLoader();
    }
  };
  
  // отображение ошибки, что запрос пустой
  function displayNoneQuery (message: string): void {
    if (!resultsContainer) {
      return;
      };
    resultsContainer.innerHTML = '';

    const errorMessage = document.createElement('p');
    errorMessage.classList.add('error');
    errorMessage.innerHTML = message;
    resultsContainer.appendChild(errorMessage);
  };

  // Функция для отображения репозиториев
  const displayRepositories = (repositories: IRepository[]): void => {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    const repoContainer = document.createElement('div');
    repoContainer.classList.add('repo-container');

    repositories.forEach((repo) => {
      const repoCard = document.createElement('button');
      repoCard.classList.add('repo-card');
      repoCard.innerHTML = `
        <p>Author name: ${repo.owner.login}</p>
        <p>Repository: ${repo.name}</p>
        <p>${repo.stargazers_count} stars</p>
      `;

      repoCard.addEventListener('click', () => {
        displayRepositoryDetails(repo);
        searchInput.value = '';
      });

      repoContainer.appendChild(repoCard);

      resultsContainer.prepend(repoContainer);
    });
  };

  // Функция для обработки пользовательского ввода и выполнения поиска
  const handleSearch = debounce(async (event: Event) => {
    const query = (event.target as HTMLInputElement).value;
    if (!query) {
      displayNoneQuery('The request is empty');
      return;
    }
    try {
      const repositories = await searchRepositories(query);
      if (repositories.length === 0) {
        displayNoneQuery('Nothing found on this request');
        return;
      }

      displayRepositories(repositories);
    } catch (error) {
      console.error('Error searching repositories:', error);
      // Обработка ошибок
      displayNoneQuery(`Repository search error ${error.message}`);
    }
  }, 600);

  // Добавление обработчика события на поле поиска
  if(!searchInput) return;
  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }

  const getRepositoryDetails = async (repo: IRepository): Promise<IRepository> => {
    try {
      showLoader();
      const response = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}`);
      if (!response.ok) {
        throw new Error('Ошибка получения данных о репозитории');
      }
      hideLoader();
      return await response.json();
    } catch (error) {
      displayNoneQuery('Ошибка получения данных о репозитории');
      throw error;
    } finally {
      hideLoader();
    }
  };

  const displayRepositoryDetails = async (repository: IRepository): Promise<void> => {
    showLoader();
    const existingModal = document.querySelector('.modal-container');
    if (existingModal) {
      existingModal.remove();
    }
      
    try {
      const repoDetails = await getRepositoryDetails(repository);

      const modalContainer = document.createElement('div');
      modalContainer.classList.add('modal-container');

      const modalContent = document.createElement('div');
      modalContent.classList.add('modal-content');

      modalContent.innerHTML = `
        <span class="close-btn">&times;</span>
        <p><strong>Author name:</strong> ${repoDetails.owner.login}</p>
        <p><strong>Repository:</strong> ${repoDetails.name}</p>
        <p><strong>Stars:</strong> ${repoDetails.stargazers_count}</p>
        <p><strong>Description:</strong> ${repoDetails.description}</p>
        <p><strong>URL:</strong> <a href="${repoDetails.html_url}" target="_blank">${repoDetails.html_url}</a></p>
        <p><strong>Forks:</strong> ${repoDetails.forks_count}</p>
        <p><strong>Open Issues:</strong> ${repoDetails.open_issues_count}</p>
        <p><strong>Language:</strong> ${repoDetails.language}</p>
      `;

      modalContainer.appendChild(modalContent);
      resultsContainer.append(modalContainer);

      const closeBtn = modalContent.querySelector('.close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          modalContainer.remove();
        });
      }
    } catch (error) {
      console.error('Error fetching repository details:', error);
      displayNoneQuery('Ошибка получения данных о репозитории');
    } finally {
      hideLoader();
    }
  }
});