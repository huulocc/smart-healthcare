import type { PageResponse } from '../../api/adminTypes';

interface Props {
  page: Pick<
    PageResponse<unknown>,
    'page' | 'size' | 'totalElements' | 'totalPages'
  >;
  onPage: (page: number) => void;
}

/** At most this many numbered buttons; the window slides to keep the current page inside. */
const WINDOW = 5;

const pageNumbers = (current: number, total: number) => {
  const first = Math.max(
    0,
    Math.min(current - Math.floor(WINDOW / 2), total - WINDOW),
  );
  return Array.from(
    { length: Math.min(WINDOW, total) },
    (_, index) => first + index,
  );
};

/** Reads a PageResponse straight off the API, so the counts are the server's, not a guess. */
const Pagination = ({ page, onPage }: Props) => {
  const { page: current, size, totalElements, totalPages } = page;
  const from = totalElements === 0 ? 0 : current * size + 1;
  const to = Math.min(totalElements, (current + 1) * size);

  return (
    <div className="admin-pagination">
      <span>
        Showing {from} to {to} of {totalElements}{' '}
        {totalElements === 1 ? 'record' : 'records'}
      </span>
      {totalPages > 1 && (
        <div className="admin-pager">
          <button
            type="button"
            onClick={() => onPage(current - 1)}
            disabled={current === 0}
          >
            &lsaquo;
          </button>
          {pageNumbers(current, totalPages).map((number) => (
            <button
              key={number}
              type="button"
              className={number === current ? 'current' : undefined}
              aria-current={number === current ? 'page' : undefined}
              onClick={() => onPage(number)}
            >
              {number + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPage(current + 1)}
            disabled={current >= totalPages - 1}
          >
            &rsaquo;
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
