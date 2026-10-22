import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { listDoctorRequests, rejectDoctorRequest } from '../../api/adminApi';
import type { DoctorRequest } from '../../api/adminTypes';
import { toApiError } from '../../api/errors';
import AsyncSection from '../../components/admin/AsyncSection';
import Banner from '../../components/admin/Banner';
import DataTable, { type Column } from '../../components/admin/DataTable';
import Modal from '../../components/admin/Modal';
import Pagination from '../../components/admin/Pagination';
import { useAsync } from '../../hooks/useAsync';

import ApproveDoctorModal from './ApproveDoctorModal';
import styles from './AdminDoctors.module.css';

const PAGE_SIZE = 20;

/**
 * The approval queue. The backend has had it all along -- list, approve, reject -- with no
 * screen in front of it, so a doctor sign-up could only be approved by hand with an HTTP
 * client.
 */
const AdminDoctorRequests = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 0);

  const [banner, setBanner] = useState<{
    tone: 'error' | 'success';
    text: string;
  } | null>(null);
  const [approving, setApproving] = useState<DoctorRequest | null>(null);
  const [rejecting, setRejecting] = useState<DoctorRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useAsync(
    useCallback(() => listDoctorRequests(page, PAGE_SIZE), [page]),
    [page],
  );

  const reject = async (request: DoctorRequest) => {
    setBanner(null);
    setBusy(true);
    try {
      await rejectDoctorRequest(request.userId);
      setBanner({
        tone: 'success',
        text: `${request.fullName} is now an ordinary patient.`,
      });
      list.reload();
    } catch (caught) {
      setBanner({ tone: 'error', text: toApiError(caught).message });
    } finally {
      setBusy(false);
      setRejecting(null);
    }
  };

  const columns: Column<DoctorRequest>[] = [
    {
      header: 'Applicant',
      cell: (request) => (
        <div className="admin-person">
          <div>
            <strong>{request.fullName}</strong>
            <small>{request.email}</small>
          </div>
        </div>
      ),
    },
    { header: 'Phone', cell: (request) => request.phone },
    {
      header: 'Signed up',
      cell: (request) => format(new Date(request.registeredAt), 'd MMM yyyy'),
    },
    {
      header: 'Account',
      cell: (request) =>
        request.emailVerified ? (
          <span className="admin-badge success">Activated</span>
        ) : (
          <span className="admin-badge warning">Not activated</span>
        ),
    },
    {
      header: 'Actions',
      cell: (request) => (
        <div className={styles.actions}>
          <button
            type="button"
            className="admin-primary-btn"
            // The server refuses an unactivated account with a 409; do not offer the click.
            disabled={!request.emailVerified || busy}
            title={
              request.emailVerified
                ? undefined
                : 'This account has not opened its activation link yet'
            }
            onClick={() => setApproving(request)}
          >
            Approve
          </button>
          <button
            type="button"
            className="admin-secondary-btn"
            disabled={busy}
            onClick={() => setRejecting(request)}
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Doctor Requests</h1>
          <p>
            People who asked to be a doctor when they signed up. Longest waiting
            first.
          </p>
        </div>
      </div>

      <section className="admin-card admin-section-card">
        {banner && (
          <div className={styles.banner}>
            <Banner tone={banner.tone}>{banner.text}</Banner>
          </div>
        )}

        <AsyncSection state={list.state} onRetry={list.reload}>
          {(data) => (
            <>
              <DataTable
                columns={columns}
                rows={data.content}
                rowKey={(request) => request.userId}
                empty="No pending doctor requests."
              />
              <Pagination
                page={data}
                onPage={(next) =>
                  setSearchParams({ page: String(next) }, { replace: true })
                }
              />
            </>
          )}
        </AsyncSection>
      </section>

      {approving !== null && (
        <ApproveDoctorModal
          request={approving}
          onClose={() => setApproving(null)}
          onApproved={(doctor) => {
            setApproving(null);
            setBanner({
              tone: 'success',
              text: `${doctor.fullName} is now a doctor (${doctor.doctorCode}).`,
            });
            list.reload();
          }}
        />
      )}

      {rejecting !== null && (
        <Modal
          title={`Reject ${rejecting.fullName}?`}
          onClose={() => setRejecting(null)}
          footer={
            <>
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => setRejecting(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-primary-btn"
                disabled={busy}
                onClick={() => reject(rejecting)}
              >
                Reject
              </button>
            </>
          }
        >
          <p className={styles.confirm}>
            They go back to being an ordinary patient and leave this list.
            Nothing records that a request was declined, and there is no way for
            them to ask again.
          </p>
        </Modal>
      )}
    </>
  );
};

export default AdminDoctorRequests;
